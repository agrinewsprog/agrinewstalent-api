# GUÍA DE PRUEBAS: FASE 4 - MÓDULOS COMPLETOS

Guía paso a paso para probar todos los módulos de la FASE 4: Courses, Promotions, Notifications y Agreements.

---

## 🛠️ REQUISITOS PREVIOS

1. **Base de datos activa:**
```powershell
docker-compose up -d
```

2. **Ejecutar migraciones:**
```powershell
npx prisma migrate deploy
```

3. **Servidor en ejecución:**
```powershell
npm run dev
```

4. **Registrar usuarios** (si no tienes aún):
   - 1 SUPER_ADMIN
   - 1 Universidad
   - 1 Empresa
   - 2 Estudiantes

---

## 📚 ESCENARIO 1: COURSES (CURSOS)

### 1.1. Crear Cursos Manualmente en la Base de Datos

Conectarse a la base de datos y ejecutar:

```sql
INSERT INTO Course (title, description, duration, platform, url, createdAt, updatedAt)
VALUES 
('Node.js Avanzado', 'Curso completo de Node.js con Express y TypeScript', 40, 'Udemy', 'https://udemy.com/nodejs', NOW(), NOW()),
('React desde Cero', 'Aprende React hooks, context y Redux', 35, 'Platzi', 'https://platzi.com/react', NOW(), NOW()),
('MySQL para Desarrolladores', 'Base de datos relacional con MySQL', 25, 'Coursera', 'https://coursera.org/mysql', NOW(), NOW());
```

O usar Prisma Studio:
```powershell
npx prisma studio
```

### 1.2. Listar Cursos (Cualquier Usuario Autenticado)
**GET** `http://localhost:3000/api/courses`

**Headers:**
```
Cookie: accessToken=<CUALQUIER_TOKEN>
```

✅ **Resultado esperado:** Lista de 3 cursos

---

### 1.3. Buscar Cursos
**GET** `http://localhost:3000/api/courses?search=Node`

**Headers:**
```
Cookie: accessToken=<CUALQUIER_TOKEN>
```

✅ **Resultado esperado:** Solo "Node.js Avanzado"

---

### 1.4. Estudiante Completa Curso
**POST** `http://localhost:3000/api/courses/1/complete`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

**Body:**
```json
{
  "certificateUrl": "https://storage.example.com/cert-nodejs-juan.pdf"
}
```

✅ **Resultado esperado:** 
- Status 201
- Mensaje: "Course marked as completed successfully"
- Objeto `completion` con datos del curso y estudiante

---

### 1.5. Intentar Completar el Mismo Curso (debe fallar)
**POST** `http://localhost:3000/api/courses/1/complete`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Course already completed"

---

### 1.6. Ver Mis Cursos Completados
**GET** `http://localhost:3000/api/courses/me/completions`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Array `completions` con 1 curso completado
- Total: 1

---

## 🎁 ESCENARIO 2: PROMOTIONS (PROMOCIONES)

### 2.1. Crear Promoción (Solo SUPER_ADMIN)
**POST** `http://localhost:3000/api/promotions/admin/create`

**Headers:**
```
Cookie: accessToken=<SUPER_ADMIN_TOKEN>
```

**Body:**
```json
{
  "code": "STUDENT2025",
  "description": "Descuento del 20% para estudiantes durante 2025",
  "discountPercent": 20,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "targetRole": "STUDENT",
  "maxUses": 1000
}
```

✅ **Resultado esperado:** 
- Status 201
- Promoción creada con `isActive: true`
- `currentUses: 0`

📝 **Guardar:** `promotionId`

---

### 2.2. Intentar Crear con Mismo Código (debe fallar)
**POST** `http://localhost:3000/api/promotions/admin/create`

**Headers:**
```
Cookie: accessToken=<SUPER_ADMIN_TOKEN>
```

**Body:**
```json
{
  "code": "STUDENT2025",
  "description": "Otra promo",
  "discountPercent": 10,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z"
}
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Promotion code already exists"

---

### 2.3. Crear Promoción para Universidad Específica
**POST** `http://localhost:3000/api/promotions/admin/create`

**Headers:**
```
Cookie: accessToken=<SUPER_ADMIN_TOKEN>
```

**Body:**
```json
{
  "code": "UNMSM50",
  "description": "50% de descuento para UNMSM",
  "discountPercent": 50,
  "startDate": "2025-02-01T00:00:00.000Z",
  "endDate": "2025-06-30T23:59:59.000Z",
  "targetUniversityId": 1,
  "maxUses": 50
}
```

✅ **Resultado esperado:** Promoción creada con targeting

---

### 2.4. Listar Promociones Activas
**GET** `http://localhost:3000/api/promotions?isActive=true`

**Headers:**
```
Cookie: accessToken=<CUALQUIER_TOKEN>
```

✅ **Resultado esperado:** 2 promociones activas

---

### 2.5. Validar Código de Promoción (Estudiante)
**GET** `http://localhost:3000/api/promotions/STUDENT2025/validate`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Mensaje: "Promotion applied successfully"
- Discount info
- `currentUses` incrementado a 1

---

### 2.6. Intentar Validar Código No Apto para el Rol (Empresa intenta código de estudiantes)
**GET** `http://localhost:3000/api/promotions/STUDENT2025/validate`

**Headers:**
```
Cookie: accessToken=<COMPANY_TOKEN>
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Promotion is not available for your role"

---

### 2.7. Desactivar Promoción
**PATCH** `http://localhost:3000/api/promotions/admin/1`

**Headers:**
```
Cookie: accessToken=<SUPER_ADMIN_TOKEN>
```

**Body:**
```json
{
  "isActive": false
}
```

✅ **Resultado esperado:** 
- Mensaje: "Promotion deactivated successfully"
- `isActive: false`

---

### 2.8. Intentar Validar Código Desactivado
**GET** `http://localhost:3000/api/promotions/STUDENT2025/validate`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Promotion is not active"

---

## 🔔 ESCENARIO 3: NOTIFICATIONS (NOTIFICACIONES)

### 3.1. Crear Notificación Manualmente (para pruebas)

Usar Prisma Studio o SQL:

```sql
INSERT INTO Notification (userId, title, message, type, isRead, createdAt)
VALUES 
(3, 'Bienvenido a la plataforma', 'Gracias por registrarte', 'GENERAL', false, NOW()),
(3, 'Nueva oferta disponible', 'Hay una nueva oferta que podría interesarte', 'GENERAL', false, NOW());
```

Donde `userId = 3` es el ID del estudiante.

O usar el helper en código (llamar desde applications cuando se cambia estado).

---

### 3.2. Listar Todas Mis Notificaciones
**GET** `http://localhost:3000/api/notifications`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Array de 2 notificaciones
- `unreadCount: 2`

---

### 3.3. Filtrar Solo No Leídas
**GET** `http://localhost:3000/api/notifications?isRead=false`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 2 notificaciones no leídas

---

### 3.4. Marcar Notificación como Leída
**POST** `http://localhost:3000/api/notifications/1/read`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Mensaje: "Notification marked as read"
- `isRead: true`

---

### 3.5. Intentar Marcar la Misma Notificación (debe fallar)
**POST** `http://localhost:3000/api/notifications/1/read`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Notification is already marked as read"

---

### 3.6. Marcar Todas como Leídas
**POST** `http://localhost:3000/api/notifications/read-all`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Mensaje: "1 notifications marked as read" (solo queda 1 no leída)
- `count: 1`

---

### 3.7. Eliminar Notificación
**DELETE** `http://localhost:3000/api/notifications/1`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

✅ **Resultado esperado:** 
- Mensaje: "Notification deleted successfully"

---

### 3.8. Intentar Acceder a Notificación de Otro Usuario (debe fallar)
Crear notificación para userId = 5 (empresa), luego intentar:

**POST** `http://localhost:3000/api/notifications/3/read`

**Headers:**
```
Cookie: accessToken=<STUDENT_TOKEN>
```

❌ **Resultado esperado:** 
- Status 403
- Error: "Unauthorized to mark this notification as read"

---

## 🤝 ESCENARIO 4: AGREEMENTS (CONVENIOS)

### 4.1. Universidad Crea Convenio con Empresa
**POST** `http://localhost:3000/api/agreements`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY_TOKEN>
```

**Body:**
```json
{
  "universityId": 1,
  "companyId": 1,
  "title": "Convenio de Prácticas Profesionales 2025",
  "description": "Acuerdo para prácticas preprofesionales de estudiantes de Ingeniería de Sistemas en TechCorp",
  "startDate": "2025-03-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z"
}
```

✅ **Resultado esperado:** 
- Status 201
- Convenio creado con `status: "PENDING"`
- Datos de universidad y empresa incluidos

📝 **Guardar:** `agreementId`

---

### 4.2. Intentar Crear Convenio Duplicado (debe fallar)
**POST** `http://localhost:3000/api/agreements`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY_TOKEN>
```

**Body:** (mismo que antes)

❌ **Resultado esperado:** 
- Status 400
- Error: "An active agreement already exists between this university and company"

---

### 4.3. Empresa Ve el Convenio
**GET** `http://localhost:3000/api/agreements/1`

**Headers:**
```
Cookie: accessToken=<COMPANY_TOKEN>
```

✅ **Resultado esperado:** Detalles completos del convenio

---

### 4.4. Empresa Acepta el Convenio (cambia a ACTIVE)
**PATCH** `http://localhost:3000/api/agreements/1/status`

**Headers:**
```
Cookie: accessToken=<COMPANY_TOKEN>
```

**Body:**
```json
{
  "status": "ACTIVE"
}
```

✅ **Resultado esperado:** 
- Mensaje: "Agreement status updated to ACTIVE"
- `status: "ACTIVE"`

---

### 4.5. Universidad Lista Sus Convenios
**GET** `http://localhost:3000/api/agreements/me/list`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY_TOKEN>
```

✅ **Resultado esperado:** 
- Array con 1 convenio
- `total: 1`

---

### 4.6. Empresa Lista Sus Convenios
**GET** `http://localhost:3000/api/agreements/me/list`

**Headers:**
```
Cookie: accessToken=<COMPANY_TOKEN>
```

✅ **Resultado esperado:** Mismo convenio

---

### 4.7. Listar Convenios Activos Globalmente
**GET** `http://localhost:3000/api/agreements?status=ACTIVE`

**Headers:**
```
Cookie: accessToken=<CUALQUIER_TOKEN>
```

✅ **Resultado esperado:** 1 convenio activo

---

### 4.8. Intentar Modificar Convenio de Otra Universidad (debe fallar)
Registrar otra universidad (universityId = 2), luego:

**PATCH** `http://localhost:3000/api/agreements/1/status`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY2_TOKEN>
```

**Body:**
```json
{
  "status": "CLOSED"
}
```

❌ **Resultado esperado:** 
- Status 403
- Error: "Unauthorized to update this agreement"

---

### 4.9. Cerrar Convenio
**PATCH** `http://localhost:3000/api/agreements/1/status`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY_TOKEN>
```

**Body:**
```json
{
  "status": "CLOSED"
}
```

✅ **Resultado esperado:** 
- Mensaje: "Agreement status updated to CLOSED"
- `status: "CLOSED"`

---

### 4.10. Eliminar Convenio
**DELETE** `http://localhost:3000/api/agreements/1`

**Headers:**
```
Cookie: accessToken=<UNIVERSITY_TOKEN>
```

✅ **Resultado esperado:** 
- Mensaje: "Agreement deleted successfully"

---

## ✅ CHECKLIST DE VALIDACIONES

### Courses:
- [ ] Listar cursos funciona para todos
- [ ] Solo estudiantes pueden completar cursos
- [ ] No se puede completar el mismo curso dos veces
- [ ] Ver completions muestra solo los del estudiante logueado

### Promotions:
- [ ] Solo SUPER_ADMIN puede crear promociones
- [ ] Código de promoción es único
- [ ] Validación de fechas funciona
- [ ] Targeting por rol funciona correctamente
- [ ] Targeting por universidad funciona
- [ ] Promoción desactivada no se puede usar
- [ ] MaxUses se respeta
- [ ] CurrentUses incrementa al validar

### Notifications:
- [ ] Usuario solo ve sus propias notificaciones
- [ ] Contador de no leídas es correcto
- [ ] Marcar como leída funciona
- [ ] No se puede marcar la misma dos veces
- [ ] Marcar todas como leídas funciona
- [ ] No se puede acceder a notificaciones de otros usuarios
- [ ] Eliminar notificación funciona

### Agreements:
- [ ] Solo universidad o empresa pueden crear convenios
- [ ] No se puede duplicar convenio activo entre mismas partes
- [ ] Solo partes involucradas pueden modificar
- [ ] Estados cambian correctamente (PENDING → ACTIVE → CLOSED)
- [ ] Listar mis convenios muestra solo los propios
- [ ] No se puede modificar convenio de otros

---

## 🔄 FLUJO COMPLETO INTEGRADO

### Caso de Uso Real:

1. **SUPER_ADMIN** crea promoción para estudiantes
2. **Universidad** crea convenio con **Empresa**
3. **Empresa** acepta convenio (ACTIVE)
4. **Universidad** crea programa relacionado al convenio
5. **Estudiante** se afilia a universidad
6. **Estudiante** completa curso requerido
7. **Empresa** crea oferta en programa
8. **Universidad** aprueba oferta
9. **Estudiante** aplica a oferta usando código de promoción
10. **Sistema** crea notificación automática al estudiante
11. **Empresa** cambia estado de postulación
12. **Sistema** crea nueva notificación
13. **Estudiante** marca notificaciones como leídas

---

## 🛠️ TROUBLESHOOTING

### Error: "Cannot find module"
```powershell
npx prisma generate
npm install
```

### Error: "Table doesn't exist"
```powershell
npx prisma migrate deploy
```

### Error: "Unauthorized"
Verificar que el token corresponda al rol requerido para el endpoint.

### Error 403: Forbidden
El rol del usuario no tiene permisos para ese endpoint (revisar authorize middleware).

---

## 📊 RESUMEN DE TESTS

- **Courses:** 6 tests
- **Promotions:** 8 tests
- **Notifications:** 8 tests
- **Agreements:** 10 tests

**Total:** 32 casos de prueba

---

**TESTING FASE 4 COMPLETADO** ✅
