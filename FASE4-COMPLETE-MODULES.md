# FASE 4: CURSOS, PROMOCIONES, NOTIFICACIONES Y CONVENIOS

Implementación completa de los módulos restantes del sistema de gestión de talento.

---

## 📊 MODELOS DE DATOS

### Course
- `id`: ID único
- `title`: Título del curso
- `description`: Descripción del curso
- `duration`: Duración en horas (nullable)
- `platform`: Plataforma del curso (nullable)
- `url`: URL del curso (nullable)
- `createdAt, updatedAt`: Timestamps
- **Relaciones**: CourseCompletion[]

### CourseCompletion
- `id`: ID único
- `courseId`: ID del curso (FK)
- `studentId`: ID del estudiante (FK)
- `completedAt`: Fecha de completado
- `certificateUrl`: URL del certificado (nullable)
- **Restricción**: @@unique([courseId, studentId])

### Promotion
- `id`: ID único
- `code`: Código único de promoción
- `description`: Descripción
- `discountPercent`: Porcentaje de descuento (nullable)
- `discountAmount`: Monto de descuento (nullable)
- `startDate`: Fecha de inicio
- `endDate`: Fecha de fin
- `isActive`: Promoción activa (boolean)
- `targetRole`: Rol objetivo (STUDENT, COMPANY, UNIVERSITY, SUPER_ADMIN) (nullable)
- `targetUniversityId`: ID de universidad objetivo (nullable)
- `maxUses`: Máximo de usos (nullable)
- `currentUses`: Usos actuales
- `createdAt, updatedAt`: Timestamps

### Notification
- `id`: ID único
- `userId`: ID del usuario (FK)
- `title`: Título de la notificación
- `message`: Mensaje
- `type`: NotificationType (APPLICATION_STATUS_CHANGED, OFFER_APPROVED, COMPANY_APPROVED, PROGRAM_CREATED, GENERAL)
- `relatedId`: ID de entidad relacionada (nullable)
- `isRead`: Leída o no (boolean)
- `createdAt`: Timestamp

### Agreement
- `id`: ID único
- `universityId`: ID de la universidad (FK)
- `companyId`: ID de la empresa (FK)
- `title`: Título del convenio
- `description`: Descripción (nullable)
- `startDate`: Fecha de inicio
- `endDate`: Fecha de fin (nullable)
- `status`: AgreementStatus (PENDING, ACTIVE, CLOSED)
- `createdAt, updatedAt`: Timestamps

---

## 📚 MÓDULO: COURSES

### 1. Listar Cursos (Autenticado)
**GET** `/api/courses?page=1&limit=20&search=Node.js`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 20, max: 100)
- `search`: Buscar por título, descripción o plataforma (opcional)

**Response 200:**
```json
{
  "courses": [
    {
      "id": 1,
      "title": "Node.js Avanzado",
      "description": "Curso completo de Node.js con Express y TypeScript",
      "duration": 40,
      "platform": "Udemy",
      "url": "https://udemy.com/nodejs-avanzado",
      "createdAt": "2025-02-18T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 2. Marcar Curso como Completado (Solo Estudiantes)
**POST** `/api/courses/:id/complete`

**Headers:**
```
Cookie: accessToken=<JWT_ESTUDIANTE>
```

**Body:**
```json
{
  "certificateUrl": "https://storage.example.com/certificates/student123-nodejs.pdf"
}
```

**Response 201:**
```json
{
  "message": "Course marked as completed successfully",
  "completion": {
    "id": 1,
    "courseId": 1,
    "studentId": 2,
    "completedAt": "2025-02-18T11:00:00.000Z",
    "certificateUrl": "https://storage.example.com/certificates/student123-nodejs.pdf",
    "course": {
      "id": 1,
      "title": "Node.js Avanzado",
      "duration": 40
    },
    "student": {
      "id": 2,
      "userId": 3,
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }
}
```

**Errores:**
- `404`: "Course not found"
- `400`: "Course already completed"

---

### 3. Ver Mis Cursos Completados (Solo Estudiantes)
**GET** `/api/courses/me/completions`

**Headers:**
```
Cookie: accessToken=<JWT_ESTUDIANTE>
```

**Response 200:**
```json
{
  "completions": [
    {
      "id": 1,
      "courseId": 1,
      "completedAt": "2025-02-18T11:00:00.000Z",
      "certificateUrl": "https://storage.example.com/certificates/student123-nodejs.pdf",
      "course": {
        "id": 1,
        "title": "Node.js Avanzado",
        "description": "Curso completo...",
        "duration": 40,
        "platform": "Udemy"
      }
    }
  ],
  "total": 1
}
```

---

## 🎁 MÓDULO: PROMOTIONS

### 4. Crear Promoción (Solo SUPER_ADMIN)
**POST** `/api/promotions/admin/create`

**Headers:**
```
Cookie: accessToken=<JWT_SUPER_ADMIN>
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

**Response 201:**
```json
{
  "message": "Promotion created successfully",
  "promotion": {
    "id": 1,
    "code": "STUDENT2025",
    "description": "Descuento del 20% para estudiantes durante 2025",
    "discountPercent": 20,
    "discountAmount": null,
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.000Z",
    "isActive": true,
    "targetRole": "STUDENT",
    "targetUniversityId": null,
    "maxUses": 1000,
    "currentUses": 0,
    "createdAt": "2025-02-18T12:00:00.000Z",
    "targetUniversity": null
  }
}
```

**Errores:**
- `400`: "End date must be after start date"
- `400`: "Promotion code already exists"
- `400`: "Either discountPercent or discountAmount must be provided"

---

### 5. Listar Promociones (Autenticado)
**GET** `/api/promotions?isActive=true&targetRole=STUDENT&page=1&limit=20`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `page`: Número de página
- `limit`: Resultados por página
- `isActive`: Filtrar por activas (true/false)
- `targetRole`: Filtrar por rol objetivo

**Response 200:**
```json
{
  "promotions": [
    {
      "id": 1,
      "code": "STUDENT2025",
      "description": "Descuento del 20% para estudiantes durante 2025",
      "discountPercent": 20,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.000Z",
      "isActive": true,
      "targetRole": "STUDENT",
      "maxUses": 1000,
      "currentUses": 45
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 6. Validar y Aplicar Código de Promoción (Autenticado)
**GET** `/api/promotions/:code/validate`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Promotion applied successfully",
  "promotion": {
    "code": "STUDENT2025",
    "discountPercent": 20,
    "discountAmount": null
  }
}
```

**Errores:**
- `400`: "Invalid promotion code"
- `400`: "Promotion is not active"
- `400`: "Promotion has not started yet"
- `400`: "Promotion has expired"
- `400`: "Promotion has reached maximum uses"
- `400`: "Promotion is not available for your role"
- `400`: "Promotion is not available for your university"

---

### 7. Activar/Desactivar Promoción (Solo SUPER_ADMIN)
**PATCH** `/api/promotions/admin/:id`

**Headers:**
```
Cookie: accessToken=<JWT_SUPER_ADMIN>
```

**Body:**
```json
{
  "isActive": false
}
```

**Response 200:**
```json
{
  "message": "Promotion deactivated successfully",
  "promotion": {
    "id": 1,
    "code": "STUDENT2025",
    "isActive": false
  }
}
```

---

## 🔔 MÓDULO: NOTIFICATIONS

### 8. Listar Mis Notificaciones (Autenticado)
**GET** `/api/notifications?isRead=false&type=APPLICATION_STATUS_CHANGED&page=1&limit=20`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `page`: Número de página
- `limit`: Resultados por página
- `isRead`: Filtrar por leídas/no leídas
- `type`: Filtrar por tipo de notificación

**Response 200:**
```json
{
  "notifications": [
    {
      "id": 1,
      "userId": 3,
      "title": "Tu postulación ha sido vista",
      "message": "Tu postulación a \"Desarrollador Backend\" ha cambiado a: VIEWED",
      "type": "APPLICATION_STATUS_CHANGED",
      "relatedId": 5,
      "isRead": false,
      "createdAt": "2025-02-18T13:00:00.000Z"
    }
  ],
  "unreadCount": 3,
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 9. Marcar Notificación como Leída (Autenticado)
**POST** `/api/notifications/:id/read`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Notification marked as read",
  "notification": {
    "id": 1,
    "userId": 3,
    "isRead": true
  }
}
```

**Errores:**
- `404`: "Notification not found"
- `403`: "Unauthorized to mark this notification as read"
- `400`: "Notification is already marked as read"

---

### 10. Marcar Todas como Leídas (Autenticado)
**POST** `/api/notifications/read-all`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "3 notifications marked as read",
  "count": 3
}
```

---

### 11. Eliminar Notificación (Autenticado)
**DELETE** `/api/notifications/:id`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Notification deleted successfully"
}
```

---

## 🤝 MÓDULO: AGREEMENTS

### 12. Crear Convenio (Universidad o Empresa)
**POST** `/api/agreements`

**Headers:**
```
Cookie: accessToken=<JWT_UNIVERSIDAD_O_EMPRESA>
```

**Body:**
```json
{
  "universityId": 1,
  "companyId": 1,
  "title": "Convenio de Prácticas Profesionales 2025",
  "description": "Acuerdo para prácticas preprofesionales de estudiantes de Ingeniería de Sistemas",
  "startDate": "2025-03-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z"
}
```

**Response 201:**
```json
{
  "message": "Agreement created successfully",
  "agreement": {
    "id": 1,
    "universityId": 1,
    "companyId": 1,
    "title": "Convenio de Prácticas Profesionales 2025",
    "description": "Acuerdo para prácticas...",
    "startDate": "2025-03-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.000Z",
    "status": "PENDING",
    "createdAt": "2025-02-18T14:00:00.000Z",
    "university": {
      "id": 1,
      "universityName": "Universidad Nacional Mayor de San Marcos",
      "city": "Lima",
      "country": "Perú"
    },
    "company": {
      "id": 1,
      "companyName": "TechCorp SAC",
      "industry": "Tecnología",
      "city": "Lima",
      "country": "Perú"
    }
  }
}
```

**Errores:**
- `400`: "End date must be after start date"
- `400`: "An active agreement already exists between this university and company"
- `400`: "Unauthorized to create agreement for this university/company"

---

### 13. Listar Convenios (Autenticado)
**GET** `/api/agreements?status=ACTIVE&universityId=1&page=1&limit=20`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `page`: Número de página
- `limit`: Resultados por página
- `status`: Filtrar por estado (PENDING, ACTIVE, CLOSED)
- `universityId`: Filtrar por universidad
- `companyId`: Filtrar por empresa

**Response 200:**
```json
{
  "agreements": [
    {
      "id": 1,
      "title": "Convenio de Prácticas Profesionales 2025",
      "status": "ACTIVE",
      "startDate": "2025-03-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.000Z",
      "university": {
        "universityName": "Universidad Nacional Mayor de San Marcos"
      },
      "company": {
        "companyName": "TechCorp SAC"
      }
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 14. Ver Detalles de Convenio (Autenticado)
**GET** `/api/agreements/:id`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "id": 1,
  "universityId": 1,
  "companyId": 1,
  "title": "Convenio de Prácticas Profesionales 2025",
  "description": "Acuerdo para prácticas preprofesionales...",
  "startDate": "2025-03-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "status": "ACTIVE",
  "createdAt": "2025-02-18T14:00:00.000Z",
  "university": {
    "id": 1,
    "userId": 5,
    "universityName": "Universidad Nacional Mayor de San Marcos",
    "city": "Lima",
    "country": "Perú"
  },
  "company": {
    "id": 1,
    "userId": 6,
    "companyName": "TechCorp SAC",
    "industry": "Tecnología",
    "city": "Lima",
    "country": "Perú"
  }
}
```

---

### 15. Ver Mis Convenios (Universidad o Empresa)
**GET** `/api/agreements/me/list`

**Headers:**
```
Cookie: accessToken=<JWT_UNIVERSIDAD_O_EMPRESA>
```

**Response 200:**
```json
{
  "agreements": [
    {
      "id": 1,
      "title": "Convenio de Prácticas Profesionales 2025",
      "status": "ACTIVE",
      "startDate": "2025-03-01T00:00:00.000Z",
      "university": {
        "universityName": "Universidad Nacional Mayor de San Marcos"
      },
      "company": {
        "companyName": "TechCorp SAC"
      }
    }
  ],
  "total": 1
}
```

---

### 16. Cambiar Estado de Convenio (Universidad o Empresa Involucrada)
**PATCH** `/api/agreements/:id/status`

**Headers:**
```
Cookie: accessToken=<JWT_UNIVERSIDAD_O_EMPRESA>
```

**Body:**
```json
{
  "status": "ACTIVE"
}
```

**Estados válidos:** `PENDING`, `ACTIVE`, `CLOSED`

**Response 200:**
```json
{
  "message": "Agreement status updated to ACTIVE",
  "agreement": {
    "id": 1,
    "status": "ACTIVE",
    "university": {
      "universityName": "Universidad Nacional Mayor de San Marcos"
    },
    "company": {
      "companyName": "TechCorp SAC"
    }
  }
}
```

**Errores:**
- `404`: "Agreement not found"
- `403`: "Unauthorized to update this agreement"

---

### 17. Eliminar Convenio (Universidad o Empresa Involucrada)
**DELETE** `/api/agreements/:id`

**Headers:**
```
Cookie: accessToken=<JWT_UNIVERSIDAD_O_EMPRESA>
```

**Response 200:**
```json
{
  "message": "Agreement deleted successfully"
}
```

**Errores:**
- `404`: "Agreement not found"
- `403`: "Unauthorized to delete this agreement"

---

## 🔄 FLUJOS COMPLETOS

### Flujo de Cursos:
1. **Listar cursos disponibles**: `GET /courses`
2. **Estudiante completa curso**: `POST /courses/:id/complete`
3. **Ver mis cursos completados**: `GET /courses/me/completions`

### Flujo de Promociones:
1. **Admin crea promoción**: `POST /promotions/admin/create`
2. **Usuario lista promociones**: `GET /promotions`
3. **Usuario valida código**: `GET /promotions/:code/validate`
4. **Admin activa/desactiva**: `PATCH /promotions/admin/:id`

### Flujo de Notificaciones:
1. **Sistema crea notificación automáticamente** (al cambiar estado de postulación)
2. **Usuario lista notificaciones**: `GET /notifications`
3. **Usuario marca como leída**: `POST /notifications/:id/read`
4. **Usuario elimina notificación**: `DELETE /notifications/:id`

### Flujo de Convenios:
1. **Universidad o empresa crea convenio**: `POST /agreements`
2. **Otro lado revisa**: `GET /agreements/:id`
3. **Cambiar estado a ACTIVE**: `PATCH /agreements/:id/status`
4. **Ver mis convenios**: `GET /agreements/me/list`
5. **Cerrar convenio**: `PATCH /agreements/:id/status` → `CLOSED`

---

## ✅ VALIDACIONES IMPLEMENTADAS

### Courses:
- ✅ Solo estudiantes pueden marcar cursos como completados
- ✅ No se puede completar el mismo curso dos veces
- ✅ Validación de existencia del curso

### Promotions:
- ✅ Solo SUPER_ADMIN puede crear/modificar promociones
- ✅ Validación de fechas (endDate > startDate)
- ✅ Código de promoción único
- ✅ Validación de targeting por rol y universidad
- ✅ Validación de expiración y máximo de usos
- ✅ Incremento automático de currentUses

### Notifications:
- ✅ Solo el propietario puede marcar como leída o eliminar
- ✅ Notificaciones automáticas al cambiar estado de postulación
- ✅ Contador de no leídas
- ✅ Filtrado por tipo y estado

### Agreements:
- ✅ Solo universidad o empresa pueden crear convenios
- ✅ Validación de autorización (solo partes involucradas pueden modificar)
- ✅ No se puede duplicar convenio activo entre mismas partes
- ✅ Validación de fechas
- ✅ Control de estados (PENDING → ACTIVE → CLOSED)

---

## 📦 ARCHIVOS IMPLEMENTADOS

### Prisma:
- `prisma/schema.prisma` - 5 nuevos modelos + 2 nuevos enums
- `prisma/migrations/20260218110347_fase4_courses_promotions_notifications_agreements/` - Migración aplicada

### Courses Module (5 archivos):
- `src/modules/courses/courses.dto.ts` - DTOs con Zod
- `src/modules/courses/courses.repository.ts` - Repositorio
- `src/modules/courses/courses.service.ts` - Lógica de negocio
- `src/modules/courses/courses.controller.ts` - Controladores
- `src/modules/courses/courses.routes.ts` - Rutas

### Promotions Module (5 archivos):
- `src/modules/promotions/promotions.dto.ts` - DTOs con targeting
- `src/modules/promotions/promotions.repository.ts` - Repositorio
- `src/modules/promotions/promotions.service.ts` - Validación compleja
- `src/modules/promotions/promotions.controller.ts` - Controladores
- `src/modules/promotions/promotions.routes.ts` - Rutas con SUPER_ADMIN

### Notifications Module (5 archivos):
- `src/modules/notifications/notifications.dto.ts` - DTOs
- `src/modules/notifications/notifications.repository.ts` - Repositorio
- `src/modules/notifications/notifications.service.ts` - Helper para notificaciones automáticas
- `src/modules/notifications/notifications.controller.ts` - Controladores
- `src/modules/notifications/notifications.routes.ts` - Rutas

### Agreements Module (5 archivos):
- `src/modules/agreements/agreements.dto.ts` - DTOs
- `src/modules/agreements/agreements.repository.ts` - Repositorio
- `src/modules/agreements/agreements.service.ts` - Lógica de autorización
- `src/modules/agreements/agreements.controller.ts` - Controladores
- `src/modules/agreements/agreements.routes.ts` - Rutas

### Integration:
- `src/routes/index.ts` - Rutas montadas

---

## 🔗 INTEGRACIÓN CON MÓDULOS EXISTENTES

### Notificaciones Automáticas:
El servicio de notificaciones incluye un helper para crear notificaciones cuando cambia el estado de una postulación:

```typescript
await notificationsService.notifyApplicationStatusChange(
  userId,
  applicationId,
  'HIRED',
  'Desarrollador Backend'
);
```

Este helper puede ser llamado desde el módulo de applications al actualizar el estado.

### Validación de Cursos en Programas:
El modelo `Program` tiene un campo `requiresCourseId` que puede validarse con `CourseCompletion`:

```typescript
const hasCompleted = await coursesRepository.hasStudentCompleted(
  program.requiresCourseId,
  studentId
);

if (!hasCompleted) {
  throw new Error('Student has not completed the required course');
}
```

---

## 📊 ESTADÍSTICAS

**Total de Endpoints FASE 4:** 17
- Courses: 3 endpoints
- Promotions: 4 endpoints
- Notifications: 4 endpoints
- Agreements: 6 endpoints

**Total de Modelos FASE 4:** 5
**Total de Enums FASE 4:** 2

**Total del Proyecto Completo:**
- **Modelos:** 20 (5 FASE 1 + 5 FASE 2 + 6 FASE 3 + 5 FASE 4)
- **Enums:** 10
- **Endpoints:** 60+ endpoints

---

**FASE 4 COMPLETADA** ✅
