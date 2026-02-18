# INSTRUCCIONES DE SETUP

## 🚀 Pasos para levantar el proyecto

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear archivo .env
```bash
cp .env.example .env
```

Edita el archivo `.env` y actualiza los valores según tu configuración.

### 3. Levantar MySQL con Docker
```bash
docker-compose up -d
```

Verifica que el contenedor esté corriendo:
```bash
docker ps
```

Deberías ver algo como:
```
CONTAINER ID   IMAGE       COMMAND                  STATUS          PORTS                    NAMES
xxxxx          mysql:8.0   "docker-entrypoint.s…"   Up 10 seconds   0.0.0.0:3306->3306/tcp   agrinews_mysql
```

### 4. Generar cliente de Prisma
```bash
npm run prisma:generate
```

### 5. Ejecutar migraciones
```bash
npm run prisma:migrate
```

Cuando te pregunte por el nombre de la migración, escribe algo como: `init`

Esto creará todas las tablas en tu base de datos MySQL.

### 6. (Opcional) Ver la base de datos con Prisma Studio
```bash
npm run prisma:studio
```

Se abrirá en http://localhost:5555 una interfaz visual para ver y editar datos.

### 7. Iniciar servidor de desarrollo
```bash
npm run dev
```

Deberías ver:
```
✅ Database connected successfully

╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Server Started Successfully!             ║
║                                                ║
║   Environment: development                    ║
║   Port: 3000                                  ║
║   URL: http://localhost:3000                  ║
║                                                ║
╚════════════════════════════════════════════════╝
```

### 8. Probar la API

Health check:
```bash
curl http://localhost:3000/api/health
```

Registrar un usuario:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "STUDENT",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 🛑 Detener todo

Detener el servidor: `Ctrl + C`

Detener MySQL:
```bash
docker-compose down
```

## 🔄 Reiniciar base de datos

Si necesitas borrar todo y empezar de nuevo:

```bash
# Detener MySQL
docker-compose down

# Borrar el volumen de datos
docker volume rm agrinewstalent-api_mysql_data

# Volver a levantar
docker-compose up -d

# Ejecutar migraciones de nuevo
npm run prisma:migrate
```

## 📊 Comandos útiles de Docker

```bash
# Ver logs de MySQL
docker-compose logs -f mysql

# Acceder a MySQL CLI
docker exec -it agrinews_mysql mysql -u root -p
# Password: password

# Ver bases de datos
SHOW DATABASES;

# Usar la base de datos
USE agrinews_talent;

# Ver tablas
SHOW TABLES;
```

## ⚠️ Problemas comunes

### Error: "Can't connect to MySQL server"
- Asegúrate de que Docker esté corriendo
- Verifica que el puerto 3306 no esté ocupado
- Espera unos segundos después de `docker-compose up` para que MySQL termine de inicializarse

### Error: "Environment variable not found: DATABASE_URL"
- Asegúrate de tener el archivo `.env` creado
- Verifica que la variable `DATABASE_URL` esté definida

### Error de migración de Prisma
- Verifica que MySQL esté corriendo
- Comprueba que el `DATABASE_URL` en `.env` sea correcto
- Intenta con: `npx prisma migrate reset` (⚠️ borra todos los datos)

## 🎯 Siguiente paso

Una vez que todo funcione, puedes empezar a probar los endpoints con Postman, Thunder Client, o desde tu frontend.

¡Listo! 🎉
