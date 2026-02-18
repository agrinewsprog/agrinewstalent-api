# FASE 2: OFERTAS Y POSTULACIONES

Implementación completa del módulo de ofertas de trabajo y postulaciones con sistema de guardados, filtros, gestión de estados y notas.

---

## 📊 MODELOS DE DATOS

### JobOffer
- `id`: ID único
- `title`: Título de la oferta
- `description`: Descripción completa
- `requirements`: Requisitos del puesto
- `benefits`: Beneficios ofrecidos (opcional)
- `location`: Ubicación
- `salary`: Salario (opcional)
- `workMode`: REMOTE | HYBRID | ON_SITE
- `contractType`: FULL_TIME | PART_TIME | INTERNSHIP | FREELANCE
- `experienceLevel`: JUNIOR | SEMI_SENIOR | SENIOR | EXPERT
- `status`: DRAFT | PUBLISHED | CLOSED
- `publishedAt`: Fecha de publicación (nullable)
- `closedAt`: Fecha de cierre (nullable)
- `companyId`: ID de la empresa que publica
- `createdAt, updatedAt`: Timestamps

### SavedOffer
- `id`: ID único
- `studentId`: ID del estudiante
- `offerId`: ID de la oferta guardada
- `createdAt`: Timestamp

### JobApplication
- `id`: ID único
- `offerId`: ID de la oferta
- `studentId`: ID del estudiante
- `coverLetter`: Carta de presentación (opcional)
- `resumeUrl`: URL del CV (opcional)
- `status`: SUBMITTED | VIEWED | INTERVIEW_REQUESTED | HIRED | REJECTED
- `appliedAt`: Fecha de postulación
- `updatedAt`: Última actualización

### ApplicationEvent
- `id`: ID único
- `applicationId`: ID de la postulación
- `status`: Estado relacionado con el evento
- `description`: Descripción del evento
- `createdAt`: Timestamp

### CompanyNote
- `id`: ID único
- `applicationId`: ID de la postulación
- `companyId`: ID de la empresa
- `note`: Contenido de la nota
- `isPrivate`: true | false (visibilidad)
- `createdAt`: Timestamp

---

## 🔐 MÓDULO: OFERTAS DE TRABAJO

### 1. Crear Oferta (Solo Empresas)
**POST** `/api/offers`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Body:**
```json
{
  "title": "Desarrollador Backend Node.js",
  "description": "Buscamos desarrollador con experiencia en Node.js y TypeScript",
  "requirements": "- 2+ años de experiencia\n- Conocimiento en Express y Prisma\n- Bases de datos SQL",
  "benefits": "- Trabajo remoto\n- Horarios flexibles\n- Capacitaciones",
  "location": "Lima, Perú",
  "salary": "S/. 4,000 - S/. 6,000",
  "workMode": "REMOTE",
  "contractType": "FULL_TIME",
  "experienceLevel": "SEMI_SENIOR"
}
```

**Response 201:**
```json
{
  "message": "Job offer created successfully",
  "offer": {
    "id": 1,
    "title": "Desarrollador Backend Node.js",
    "status": "DRAFT",
    "publishedAt": null,
    "company": {
      "id": 1,
      "companyName": "TechCorp SAC",
      "industry": "Tecnología"
    },
    "createdAt": "2025-02-18T10:30:00.000Z"
  }
}
```

---

### 2. Publicar Oferta (Solo Empresas)
**POST** `/api/offers/:id/publish`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Job offer published successfully",
  "offer": {
    "id": 1,
    "status": "PUBLISHED",
    "publishedAt": "2025-02-18T10:35:00.000Z"
  }
}
```

---

### 3. Cerrar Oferta (Solo Empresas)
**POST** `/api/offers/:id/close`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Job offer closed successfully",
  "offer": {
    "id": 1,
    "status": "CLOSED",
    "closedAt": "2025-02-20T15:00:00.000Z"
  }
}
```

---

### 4. Listar Ofertas con Filtros (Público/Autenticado)
**GET** `/api/offers?status=PUBLISHED&workMode=REMOTE&location=Lima&page=1&limit=10`

**Query Params:**
- `status`: DRAFT | PUBLISHED | CLOSED (opcional)
- `companyId`: Filtrar por empresa (opcional)
- `workMode`: REMOTE | HYBRID | ON_SITE (opcional)
- `contractType`: FULL_TIME | PART_TIME | INTERNSHIP | FREELANCE (opcional)
- `experienceLevel`: JUNIOR | SEMI_SENIOR | SENIOR | EXPERT (opcional)
- `location`: Buscar por ubicación (opcional)
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 10, max: 100)

**Response 200:**
```json
{
  "offers": [
    {
      "id": 1,
      "title": "Desarrollador Backend Node.js",
      "description": "Buscamos desarrollador...",
      "location": "Lima, Perú",
      "salary": "S/. 4,000 - S/. 6,000",
      "workMode": "REMOTE",
      "contractType": "FULL_TIME",
      "experienceLevel": "SEMI_SENIOR",
      "status": "PUBLISHED",
      "publishedAt": "2025-02-18T10:35:00.000Z",
      "company": {
        "id": 1,
        "companyName": "TechCorp SAC",
        "industry": "Tecnología"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 5. Ver Detalle de Oferta
**GET** `/api/offers/:id`

**Response 200:**
```json
{
  "id": 1,
  "title": "Desarrollador Backend Node.js",
  "description": "Buscamos desarrollador con experiencia...",
  "requirements": "- 2+ años de experiencia\n- Conocimiento en Express...",
  "benefits": "- Trabajo remoto\n- Horarios flexibles...",
  "location": "Lima, Perú",
  "salary": "S/. 4,000 - S/. 6,000",
  "workMode": "REMOTE",
  "contractType": "FULL_TIME",
  "experienceLevel": "SEMI_SENIOR",
  "status": "PUBLISHED",
  "publishedAt": "2025-02-18T10:35:00.000Z",
  "company": {
    "id": 1,
    "companyName": "TechCorp SAC",
    "industry": "Tecnología",
    "description": "Empresa líder en desarrollo de software",
    "website": "https://techcorp.pe"
  },
  "createdAt": "2025-02-18T10:30:00.000Z",
  "updatedAt": "2025-02-18T10:35:00.000Z"
}
```

---

### 6. Actualizar Oferta (Solo Empresas)
**PUT** `/api/offers/:id`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Body:** (Mismos campos que crear, todos opcionales)
```json
{
  "salary": "S/. 5,000 - S/. 7,000",
  "benefits": "- Trabajo remoto\n- Horarios flexibles\n- Capacitaciones\n- Bono anual"
}
```

**Response 200:**
```json
{
  "message": "Job offer updated successfully",
  "offer": { /* oferta actualizada */ }
}
```

---

### 7. Eliminar Oferta (Solo Empresas)
**DELETE** `/api/offers/:id`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Job offer deleted successfully"
}
```

---

### 8. Guardar Oferta (Solo Estudiantes)
**POST** `/api/offers/:id/save`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 201:**
```json
{
  "message": "Offer saved successfully",
  "savedOffer": {
    "id": 1,
    "studentId": 2,
    "offerId": 1,
    "createdAt": "2025-02-18T11:00:00.000Z"
  }
}
```

---

### 9. Quitar Oferta Guardada (Solo Estudiantes)
**DELETE** `/api/offers/:id/save`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "message": "Offer unsaved successfully"
}
```

---

### 10. Ver Ofertas Guardadas (Solo Estudiantes)
**GET** `/api/offers/saved/me?page=1&limit=10`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "savedOffers": [
    {
      "id": 1,
      "createdAt": "2025-02-18T11:00:00.000Z",
      "offer": {
        "id": 1,
        "title": "Desarrollador Backend Node.js",
        "location": "Lima, Perú",
        "salary": "S/. 4,000 - S/. 6,000",
        "workMode": "REMOTE",
        "status": "PUBLISHED",
        "company": {
          "companyName": "TechCorp SAC"
        }
      }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 📝 MÓDULO: POSTULACIONES

### 1. Postularse a Oferta (Solo Estudiantes)
**POST** `/api/applications/offers/:offerId/apply`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Body:** (Ambos campos opcionales)
```json
{
  "coverLetter": "Estimados, me interesa mucho esta posición porque...",
  "resumeUrl": "https://storage.example.com/resumes/juan-perez-cv.pdf"
}
```

**Response 201:**
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": 1,
    "offerId": 1,
    "studentId": 2,
    "status": "SUBMITTED",
    "appliedAt": "2025-02-18T12:00:00.000Z",
    "student": {
      "firstName": "Juan",
      "lastName": "Pérez"
    },
    "offer": {
      "title": "Desarrollador Backend Node.js",
      "company": {
        "companyName": "TechCorp SAC"
      }
    }
  }
}
```

**Errores:**
- `400`: "Cannot apply to unpublished offer" (oferta no publicada)
- `400`: "You have already applied to this offer" (ya postulado)
- `404`: "Job offer not found"

---

### 2. Ver Mis Postulaciones (Solo Estudiantes)
**GET** `/api/applications/students/me?status=SUBMITTED&offerId=1&page=1&limit=10`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `status`: SUBMITTED | VIEWED | INTERVIEW_REQUESTED | HIRED | REJECTED (opcional)
- `offerId`: Filtrar por oferta específica (opcional)
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 10)

**Response 200:**
```json
{
  "applications": [
    {
      "id": 1,
      "status": "VIEWED",
      "appliedAt": "2025-02-18T12:00:00.000Z",
      "offer": {
        "id": 1,
        "title": "Desarrollador Backend Node.js",
        "location": "Lima, Perú",
        "workMode": "REMOTE",
        "company": {
          "companyName": "TechCorp SAC",
          "industry": "Tecnología"
        }
      }
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Ver Postulaciones a Mis Ofertas (Solo Empresas)
**GET** `/api/applications/companies/me?status=SUBMITTED&offerId=1&page=1&limit=20`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Query Params:**
- `status`: SUBMITTED | VIEWED | INTERVIEW_REQUESTED | HIRED | REJECTED (opcional)
- `offerId`: Filtrar por oferta específica (opcional)
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 10)

**Response 200:**
```json
{
  "applications": [
    {
      "id": 1,
      "status": "SUBMITTED",
      "coverLetter": "Estimados, me interesa...",
      "resumeUrl": "https://storage.example.com/resumes/juan-perez-cv.pdf",
      "appliedAt": "2025-02-18T12:00:00.000Z",
      "student": {
        "id": 2,
        "firstName": "Juan",
        "lastName": "Pérez",
        "careerField": "Ingeniería de Sistemas",
        "university": {
          "universityName": "UNMSM"
        }
      },
      "offer": {
        "id": 1,
        "title": "Desarrollador Backend Node.js"
      }
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

### 4. Actualizar Estado de Postulación (Solo Empresas)
**PATCH** `/api/applications/:id/status`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Body:**
```json
{
  "status": "INTERVIEW_REQUESTED"
}
```

**Estados válidos:**
- `SUBMITTED`: Postulación enviada
- `VIEWED`: Vista por la empresa
- `INTERVIEW_REQUESTED`: Entrevista solicitada
- `HIRED`: Contratado
- `REJECTED`: Rechazado

**Response 200:**
```json
{
  "message": "Application status updated successfully",
  "application": {
    "id": 1,
    "status": "INTERVIEW_REQUESTED",
    "updatedAt": "2025-02-18T14:00:00.000Z"
  }
}
```

**Errores:**
- `404`: "Application not found or not authorized"
- `400`: Invalid status value

---

### 5. Agregar Nota a Postulación (Solo Empresas)
**POST** `/api/applications/:id/notes`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Body:**
```json
{
  "note": "Candidato con buen perfil técnico, revisar CV con más detalle",
  "isPrivate": true
}
```

**Response 201:**
```json
{
  "message": "Note added successfully",
  "note": {
    "id": 1,
    "applicationId": 1,
    "companyId": 1,
    "note": "Candidato con buen perfil técnico...",
    "isPrivate": true,
    "createdAt": "2025-02-18T14:30:00.000Z"
  }
}
```

---

### 6. Ver Timeline de Postulación (Estudiantes y Empresas)
**GET** `/api/applications/:id/timeline`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "timeline": [
    {
      "id": 1,
      "applicationId": 1,
      "status": "SUBMITTED",
      "description": "Application submitted",
      "createdAt": "2025-02-18T12:00:00.000Z"
    },
    {
      "id": 2,
      "applicationId": 1,
      "status": "VIEWED",
      "description": "Application viewed by company",
      "createdAt": "2025-02-18T13:00:00.000Z"
    },
    {
      "id": 3,
      "applicationId": 1,
      "status": "INTERVIEW_REQUESTED",
      "description": "Interview requested",
      "createdAt": "2025-02-18T14:00:00.000Z"
    }
  ]
}
```

**Errores:**
- `404`: "Application not found or not authorized"

---

### 7. Ver Notas de Postulación (Solo Empresas)
**GET** `/api/applications/:id/notes`

**Headers:**
```
Cookie: accessToken=<JWT>
```

**Response 200:**
```json
{
  "notes": [
    {
      "id": 1,
      "note": "Candidato con buen perfil técnico...",
      "isPrivate": true,
      "createdAt": "2025-02-18T14:30:00.000Z"
    },
    {
      "id": 2,
      "note": "Entrevista agendada para el 25/02",
      "isPrivate": false,
      "createdAt": "2025-02-18T15:00:00.000Z"
    }
  ]
}
```

---

## 🔄 FLUJO COMPLETO DE USO

### Flujo del Estudiante:
1. **Explorar ofertas**: `GET /api/offers?status=PUBLISHED&workMode=REMOTE`
2. **Ver detalle**: `GET /api/offers/1`
3. **Guardar oferta**: `POST /api/offers/1/save`
4. **Ver guardadas**: `GET /api/offers/saved/me`
5. **Postularse**: `POST /api/applications/offers/1/apply`
6. **Ver mis postulaciones**: `GET /api/applications/students/me`
7. **Ver timeline**: `GET /api/applications/1/timeline`

### Flujo de la Empresa:
1. **Crear oferta**: `POST /api/offers`
2. **Publicar**: `POST /api/offers/1/publish`
3. **Ver postulaciones**: `GET /api/applications/companies/me?offerId=1`
4. **Cambiar estado**: `PATCH /api/applications/1/status` → `VIEWED`
5. **Agregar nota**: `POST /api/applications/1/notes`
6. **Solicitar entrevista**: `PATCH /api/applications/1/status` → `INTERVIEW_REQUESTED`
7. **Contratar**: `PATCH /api/applications/1/status` → `HIRED`

---

## ✅ VALIDACIONES IMPLEMENTADAS

### Ofertas:
- ✅ Solo empresas pueden crear/editar/eliminar/publicar/cerrar ofertas
- ✅ Solo estudiantes pueden guardar ofertas
- ✅ workMode debe ser: REMOTE | HYBRID | ON_SITE
- ✅ contractType debe ser: FULL_TIME | PART_TIME | INTERNSHIP | FREELANCE
- ✅ experienceLevel debe ser: JUNIOR | SEMI_SENIOR | SENIOR | EXPERT
- ✅ Paginación limitada a máximo 100 resultados por página

### Postulaciones:
- ✅ Solo se puede postular a ofertas con status PUBLISHED
- ✅ No se permite postular dos veces a la misma oferta
- ✅ Solo empresas pueden actualizar estados y agregar notas
- ✅ Solo la empresa dueña de la oferta puede modificar postulaciones
- ✅ Estados válidos: SUBMITTED | VIEWED | INTERVIEW_REQUESTED | HIRED | REJECTED
- ✅ Timeline visible para estudiante postulante y empresa dueña

---

## 🛡️ SEGURIDAD

- ✅ Autenticación JWT requerida en todos los endpoints privados
- ✅ RBAC: validación de roles en cada endpoint
- ✅ Validación de propiedad: empresas solo acceden a sus ofertas/postulaciones
- ✅ Validación de datos con Zod en todos los inputs
- ✅ Protección contra inyección SQL con Prisma ORM
- ✅ Cookies httpOnly con sameSite=lax

---

## 📦 ARCHIVOS IMPLEMENTADOS

### Ofertas:
- `src/modules/offers/offers.dto.ts` - Esquemas de validación con Zod
- `src/modules/offers/offers.repository.ts` - Acceso a datos con Prisma
- `src/modules/offers/offers.service.ts` - Lógica de negocio
- `src/modules/offers/offers.controller.ts` - Controladores HTTP
- `src/modules/offers/offers.routes.ts` - Rutas con middlewares

### Postulaciones:
- `src/modules/applications/applications.dto.ts` - Esquemas de validación
- `src/modules/applications/applications.repository.ts` - Repositorio con transacciones
- `src/modules/applications/applications.service.ts` - Lógica de postulaciones, eventos y notas
- `src/modules/applications/applications.controller.ts` - Controladores HTTP
- `src/modules/applications/applications.routes.ts` - Rutas con RBAC

### Base de Datos:
- `prisma/schema.prisma` - Modelos: JobOffer, SavedOffer, JobApplication, ApplicationEvent, CompanyNote
- `prisma/migrations/20260218102800_fase2_offers_applications/` - Migración aplicada

---

## 🚀 PRÓXIMOS PASOS (FASE 3)

- Notificaciones en tiempo real (WebSocket/Pusher)
- Sistema de mensajería entre estudiantes y empresas
- Programas académicos y universidades
- Dashboard de analytics
- Recomendaciones de ofertas con ML
- Sistema de calificaciones y reviews

---

**FASE 2 COMPLETADA** ✅
