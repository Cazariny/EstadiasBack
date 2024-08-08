# Data Weather Hub

## Description

Backend desarrollado en Nestjs para el proyecto de Data Weather Hub, encargado de obtener informacion meteorologica del estado de Michoacan y poder importarla a un archivo .csv para el uso gratuito.

### Requisitos Previos 📋
  
- Node.js _version 20.12.2_
- Nestjs _version 10.3.2_

### Instalación 🔧

1. Para la instalacion de este proyecto es necesario clonar el proyecto de github.
```
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
```

2. Una vez dentro del proyecto es necesario instalar las dependencias

```
npm install
```

3. Una vez que se instalaron las dependencias, dentro del archivo .env.template, puedes cambiar el nombre del archivo a _env.ts_ o copiarlo y nombrarlo _env.ts_. Para finalizar este paso solo es necesario cambiar el valor de las variables.


Se debe de tener en cuenta que el API_KEY y el API_SECRET son provenientes de la cuenta de la plataforma de Weatherlink, y estas variables indicara las estaciones de las cuales se podra obtener la informacion completa.

-  De no tenerse instalado mongodb se incluye un docker-compose que permite la instalacion de mongo usando el comando

  ```
  docker compose up -d
  ```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
