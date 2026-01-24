# Деплой

1. проверить настройки конфига прода [environment.ts](..%2Fsrc%2Fenvironments%2Fenvironment.ts)
    ```typescript
    export const environment = {
      production: true, // обязательно, иначе будет инициализирован перехват на эмулятор
      firebaseConfig: {
        // из лк firebase
      },
    };
    ```
2. собрать проект
    ```shell
    ng build
   ```
3. выбрать проект firebase
   ```shell
   firebase use trdc-warehouse-0x3 
   ```
4. загрузить в firebase
   ```shell
   firebase deploy
   ```
