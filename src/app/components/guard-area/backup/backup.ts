import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiAlertService, TuiButton, TuiHint, TuiLoader } from '@taiga-ui/core';
import { TuiResponsiveDialogService } from '@taiga-ui/addon-mobile';
import { TUI_CONFIRM, TuiConfirmData, TuiFiles } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';
import {
  BACKUP_COLLECTIONS,
  BackupFile,
  BackupService,
  parseBackupFile,
} from '../../../services/backup.service';
import {
  BACKUP_ARCHIVE_EXTENSION,
  createBackupArchive,
  getArchiveFileName,
  readBackupArchive,
} from '../../../services/backup-archive';

/** Задержка перед освобождением Blob URL, мс. */
const DOWNLOAD_REVOKE_DELAY_MS = 10_000;

interface CollectionRow {
  name: string;
  count: number | null;
}

@Component({
  selector: 'app-backup',
  imports: [TuiButton, TuiHint, TuiLoader, TuiFiles, ReactiveFormsModule],
  templateUrl: './backup.html',
  styleUrl: './backup.scss',
})
export class Backup implements OnInit {
  private readonly backup = inject(BackupService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<CollectionRow[]>(
    BACKUP_COLLECTIONS.map((name) => ({ name, count: null })),
  );

  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly log = signal<string[]>([]);

  /** Файлы, выбранные для восстановления: архив целиком или отдельные JSON. */
  protected readonly filesControl = new FormControl<File[]>([], { nonNullable: true });
  protected readonly selectedFiles = signal<File[]>([]);

  public constructor() {
    this.filesControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((files) => this.selectedFiles.set(files ?? []));
  }

  public ngOnInit(): void {
    this.loadCounts();
  }

  /** Убирает файл из списка выбранных. */
  protected removeFile(target: File): void {
    this.filesControl.setValue(this.selectedFiles().filter((file) => file !== target));
  }

  /** Сообщает о файлах, отклонённых по расширению. */
  protected onReject(files: readonly File[]): void {
    const names = files.map((file) => file.name).join(', ');
    this.reportError(new Error(`Неподходящий формат файла: ${names}`));
  }

  /** Выгружает все коллекции одним архивом, где каждая — отдельный JSON-файл. */
  protected async exportAll(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.log.set([]);

    try {
      const files: BackupFile[] = [];
      for (const name of BACKUP_COLLECTIONS) {
        this.status.set(`Выгрузка: ${name}`);
        const file = await this.backup.exportCollection(name);
        files.push(file);
        this.addLog(`${name}: выгружено ${file.count}`);
      }

      this.status.set('Формирование архива');
      this.download(getArchiveFileName(), createBackupArchive(files));

      this.alerts.open('Бэкап выгружен').subscribe();
      await this.loadCounts();
    } catch (error) {
      this.reportError(error);
    } finally {
      this.status.set('');
      this.busy.set(false);
    }
  }

  /** Читает выбранные файлы и полностью заменяет соответствующие коллекции. */
  protected async restore(): Promise<void> {
    const selected = this.selectedFiles();

    if (!selected.length || this.busy()) {
      return;
    }

    let files: BackupFile[];
    try {
      files = (await Promise.all(selected.map((file) => this.readSelectedFile(file)))).flat();
    } catch (error) {
      this.reportError(error);
      return;
    }

    const names = files.map((file) => `${file.collection} (${file.documents.length})`).join(', ');
    const data: TuiConfirmData = {
      content:
        `Коллекции будут полностью заменены: ${names}. ` +
        'Все текущие документы в них будут удалены безвозвратно. Продолжить?',
      yes: 'Восстановить',
      no: 'Отмена',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, { label: 'Подтвердите', size: 'm', data }),
    );

    if (!confirmed) {
      return;
    }

    this.busy.set(true);
    this.log.set([]);

    try {
      for (const file of files) {
        this.status.set(`Восстановление: ${file.collection}`);
        const result = await this.backup.restoreCollection(file);
        this.addLog(`${result.collection}: удалено ${result.deleted}, записано ${result.written}`);
      }
      this.alerts.open('Данные восстановлены').subscribe();
      this.filesControl.setValue([]);
      await this.loadCounts();
    } catch (error) {
      this.reportError(error);
    } finally {
      this.status.set('');
      this.busy.set(false);
    }
  }

  /** Архив разбирается на файлы коллекций, отдельный JSON читается как есть. */
  private async readSelectedFile(file: File): Promise<BackupFile[]> {
    if (file.name.toLowerCase().endsWith(BACKUP_ARCHIVE_EXTENSION)) {
      return readBackupArchive(file.name, new Uint8Array(await file.arrayBuffer()));
    }
    return [parseBackupFile(file.name, await file.text())];
  }

  private async loadCounts(): Promise<void> {
    const counts = await Promise.all(
      BACKUP_COLLECTIONS.map(async (name) => ({
        name,
        count: await this.backup.countDocuments(name),
      })),
    );
    this.rows.set(counts);
  }

  /** Скачивает архив. Ссылка на Blob освобождается отложенно, чтобы браузер успел её прочитать. */
  private download(fileName: string, content: Blob): void {
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_REVOKE_DELAY_MS);
  }

  private addLog(message: string): void {
    this.log.update((items) => [...items, message]);
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Ошибка резервного копирования', error);
    this.alerts.open(message, { appearance: 'negative', label: 'Ошибка' }).subscribe();
  }
}
