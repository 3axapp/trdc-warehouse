# Code Style Guide

Стиль кода поддерживается инструментами автоматически: **Prettier** (форматирование) + **ESLint** (качество). Перед коммитом запускать `ng lint --fix` или использовать форматирование по сохранению в IDE.

---

## Форматирование (Prettier)

| Параметр | Значение | Пример |
|---|---|---|
| Отступы | 2 пробела (не табы) | |
| Кавычки | одинарные | `'text'` |
| Точка с запятой | обязательна | `const x = 1;` |
| Фигурные скобки | без пробелов внутри | `{key: value}` |
| Стрелочные функции | скобки только при нескольких аргументах | `x => x * 2`, `(a, b) => a + b` |
| Закрывающий `>` тега | на отдельной строке | |
| Длина строки | 120 символов | |
| HTML | парсер `angular` | |

---

## TypeScript

### Строгий режим

Включён полный `strict` + дополнительные проверки:

```jsonc
"strict": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true
```

Angular-шаблоны тоже проверяются строго (`strictTemplates: true`).

### Модификаторы доступа

ESLint требует **явного** модификатора на каждом члене класса (`explicit-member-accessibility: error`):

```typescript
// ✓
public ngOnInit(): void { ... }
protected data = signal<Item[]>([]);
private readonly service = inject(MyService);

// ✗ — нет модификатора
ngOnInit(): void { ... }
```

Типичное распределение:

| Модификатор | Где применяется |
|---|---|
| `private readonly` | Инжектируемые зависимости |
| `private` | Внутренние методы и поля |
| `protected` | Поля и методы, доступные из шаблона |
| `public` | Публичный API сервисов, lifecycle-хуки |

### Инжекция зависимостей

Использовать функцию `inject()`, конструктор **не нужен**:

```typescript
// ✓
private readonly service = inject(MyService);

// ✗
constructor(private service: MyService) {}
```

### Фигурные скобки в управляющих конструкциях

Правило `curly: all` — скобки обязательны **всегда**, даже для однострочных тел:

```typescript
// ✓
if (x) {
  return;
}

for (const item of items) {
  process(item);
}

// ✗
if (x) return;
for (const item of items) process(item);
```

### `any`

Правило `@typescript-eslint/no-explicit-any` отключено — использование `any` допустимо там, где это неизбежно (данные из Firestore, legacy-интерфейсы). Злоупотреблять не стоит.

---

## Angular

### Компоненты и директивы

| Тип | Тип селектора | Префикс | Стиль |
|---|---|---|---|
| Компонент | element | `app` | kebab-case → `app-my-component` |
| Директива | attribute | `app` | camelCase → `appMyDirective` |

### Только standalone-компоненты

`NgModule` не используется. Все компоненты, директивы и пайпы — standalone.

### Реактивное состояние

Для состояния компонента использовать `signal()`:

```typescript
protected data = signal<Item[]>([]);
protected readonly expandedIds = signal<Set<string>>(new Set());
```

### Зонless

Приложение работает без `NgZone` (`provideZonelessChangeDetection()`). Изменения обнаруживаются через сигналы и `markForCheck`.

### Асинхронность

Предпочитать `async/await` вместо цепочек RxJS. RxJS уместен там, где нужен поток событий (диалоги через `tuiDialog(...).subscribe()`).

---

## Структура файлов

- Один компонент / сервис / коллекция на файл
- Интерфейсы моделей — в том же файле, что и коллекция:

```
quarantine-invoice.collection.ts
  ├── QuarantineInvoiceCollection  (class)
  ├── QuarantineInvoice            (interface)
  └── QuarantineInvoiceItem        (interface)
```

- Стили компонента — отдельный `.scss` файл (генерируется Angular CLI)
- Шаблон — отдельный `.html` файл

---

## Именование

| Сущность | Стиль | Пример |
|---|---|---|
| Классы | PascalCase | `SuppliesCollection` |
| Интерфейсы | PascalCase | `QuarantineInvoice` |
| Методы, поля | camelCase | `getMaxQuantity` |
| Файлы TS/HTML/SCSS | kebab-case | `quarantine-qc-form.ts` |
| Переменные в шаблонах | camelCase | `isExpanded(id)` |
| Доменные термины (UI, комментарии) | русский язык | — |
| Идентификаторы кода | английский язык | — |
