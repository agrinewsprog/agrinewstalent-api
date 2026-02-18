# Endpoints de Companies - Gestión de Candidatos

## Vista General

Endpoints para que las empresas puedan ver y gestionar los candidatos (estudiantes que han aplicado a sus ofertas de trabajo).

---

## 1. GET /companies/me/candidates

Lista todos los candidatos que han aplicado a las ofertas de trabajo de la empresa autenticada.

### Autenticación
- ✅ **Requerida**: Sí
- 🔐 **Role**: `COMPANY`

### Query Parameters (opcionales)

| Parámetro | Tipo   | Descripción                                          | Ejemplo            |
|-----------|--------|------------------------------------------------------|--------------------|
| status    | string | Filtrar por estado de aplicación                    | `PENDING`          |
| offerId   | number | Filtrar por oferta específica                        | `123`              |
| search    | string | Buscar por nombre del candidato                      | `Juan`             |
| page      | number | Número de página (default: 1)                        | `1`                |
| limit     | number | Candidatos por página (default: 10)                  | `20`               |

### Estados de Aplicación Válidos
- `PENDING` - En revisión
- `REVIEWING` - Siendo evaluado
- `INTERVIEW` - En proceso de entrevista
- `OFFERED` - Oferta enviada
- `REJECTED` - Rechazado
- `ACCEPTED` - Aceptado
- `WITHDRAWN` - Retirado por el candidato

### Request Example

```bash
GET /api/v1/companies/me/candidates?status=PENDING&page=1&limit=10
Authorization: Bearer {accessToken}
```

### Response Success (200 OK)

```json
{
  "candidates": [
    {
      "id": 45,
      "status": "PENDING",
      "resumeUrl": "https://example.com/resume.pdf",
      "coverLetter": "Me interesa mucho esta posición...",
      "appliedAt": "2026-02-15T10:30:00.000Z",
      "updatedAt": "2026-02-15T10:30:00.000Z",
      "studentId": 12,
      "offerId": 8,
      "student": {
        "id": 12,
        "firstName": "Juan",
        "lastName": "Pérez",
        "phoneNumber": "+34 612 345 678",
        "city": "Madrid",
        "country": "España",
        "resumeUrl": "https://example.com/resume.pdf",
        "linkedinUrl": "https://linkedin.com/in/juanperez",
        "githubUrl": "https://github.com/juanperez",
        "bio": "Desarrollador full-stack con 3 años de experiencia",
        "skills": "JavaScript, React, Node.js, TypeScript, PostgreSQL",
        "careerField": "Ingeniería Informática"
      },
      "offer": {
        "id": 8,
        "title": "Full Stack Developer",
        "location": "Madrid",
        "workMode": "hybrid"
      },
      "_count": {
        "events": 3,
        "notes": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Response Errors

**401 Unauthorized** - No autenticado
```json
{
  "error": "Not authenticated"
}
```

**403 Forbidden** - No es una empresa
```json
{
  "error": "Only companies can access candidates"
}
```

**404 Not Found** - Perfil de empresa no encontrado
```json
{
  "error": "Company profile not found"
}
```

---

## 2. GET /companies/candidates/:id

Obtiene los detalles completos de un candidato específico (aplicación).

### Autenticación
- ✅ **Requerida**: Sí
- 🔐 **Role**: `COMPANY`

### URL Parameters

| Parámetro | Tipo   | Descripción                      | Ejemplo |
|-----------|--------|----------------------------------|---------|
| id        | number | ID de la aplicación (candidate)  | `45`    |

### Request Example

```bash
GET /api/v1/companies/candidates/45
Authorization: Bearer {accessToken}
```

### Response Success (200 OK)

```json
{
  "id": 45,
  "status": "INTERVIEW",
  "resumeUrl": "https://example.com/resume.pdf",
  "coverLetter": "Me interesa mucho esta posición porque...",
  "appliedAt": "2026-02-15T10:30:00.000Z",
  "updatedAt": "2026-02-16T14:20:00.000Z",
  "studentId": 12,
  "offerId": 8,
  "student": {
    "id": 12,
    "userId": 5,
    "firstName": "Juan",
    "lastName": "Pérez",
    "phoneNumber": "+34 612 345 678",
    "city": "Madrid",
    "country": "España",
    "resumeUrl": "https://example.com/resume.pdf",
    "linkedinUrl": "https://linkedin.com/in/juanperez",
    "githubUrl": "https://github.com/juanperez",
    "bio": "Desarrollador full-stack apasionado por crear soluciones innovadoras",
    "skills": "JavaScript, React, Node.js, TypeScript, PostgreSQL, Docker",
    "dateOfBirth": "1998-05-15",
    "careerField": "Ingeniería Informática",
    "createdAt": "2026-01-10T08:00:00.000Z"
  },
  "offer": {
    "id": 8,
    "companyId": 3,
    "title": "Full Stack Developer",
    "description": "Buscamos desarrollador full-stack...",
    "requirements": "- 3+ años de experiencia\n- React y Node.js\n- TypeScript",
    "location": "Madrid",
    "workMode": "hybrid",
    "salary": "35.000 - 45.000 EUR",
    "contractType": "full-time",
    "experienceLevel": "mid",
    "status": "PUBLISHED",
    "publishedAt": "2026-02-10T09:00:00.000Z",
    "createdAt": "2026-02-09T15:30:00.000Z",
    "updatedAt": "2026-02-10T09:00:00.000Z",
    "company": {
      "id": 3,
      "companyName": "TechCorp Solutions"
    }
  },
  "events": [
    {
      "id": 89,
      "applicationId": 45,
      "eventType": "STATUS_CHANGE",
      "oldStatus": "REVIEWING",
      "newStatus": "INTERVIEW",
      "notes": "Candidato pasó a entrevista técnica",
      "createdAt": "2026-02-16T14:20:00.000Z"
    },
    {
      "id": 88,
      "applicationId": 45,
      "eventType": "STATUS_CHANGE",
      "oldStatus": "PENDING",
      "newStatus": "REVIEWING",
      "notes": "Iniciada revisión del perfil",
      "createdAt": "2026-02-15T11:00:00.000Z"
    }
  ],
  "notes": [
    {
      "id": 56,
      "applicationId": 45,
      "companyId": 3,
      "authorName": "María García",
      "content": "Excelente perfil técnico, destacan sus proyectos en GitHub",
      "createdAt": "2026-02-16T10:30:00.000Z"
    },
    {
      "id": 55,
      "applicationId": 45,
      "companyId": 3,
      "authorName": "Carlos López",
      "content": "Resume muy completo, experiencia alineada con nuestras necesidades",
      "createdAt": "2026-02-15T16:45:00.000Z"
    }
  ]
}
```

### Response Errors

**401 Unauthorized** - No autenticado
```json
{
  "error": "Not authenticated"
}
```

**403 Forbidden** - No es una empresa
```json
{
  "error": "Only companies can access candidates"
}
```

**404 Not Found** - Candidato no encontrado o sin acceso
```json
{
  "error": "Candidate not found or you do not have access to this application"
}
```

---

## 3. GET /companies/me/stats

Obtiene estadísticas de candidatos de la empresa.

### Autenticación
- ✅ **Requerida**: Sí
- 🔐 **Role**: `COMPANY`

### Request Example

```bash
GET /api/v1/companies/me/stats
Authorization: Bearer {accessToken}
```

### Response Success (200 OK)

```json
{
  "total": 127,
  "byStatus": {
    "PENDING": 45,
    "REVIEWING": 23,
    "INTERVIEW": 12,
    "OFFERED": 5,
    "ACCEPTED": 8,
    "REJECTED": 30,
    "WITHDRAWN": 4
  }
}
```

---

## Casos de Uso

### Caso 1: Listar todos los candidatos pendientes

```bash
GET /api/v1/companies/me/candidates?status=PENDING&page=1&limit=20
Authorization: Bearer {accessToken}
```

### Caso 2: Buscar candidatos por nombre

```bash
GET /api/v1/companies/me/candidates?search=Juan&page=1
Authorization: Bearer {accessToken}
```

### Caso 3: Ver candidatos de una oferta específica

```bash
GET /api/v1/companies/me/candidates?offerId=123
Authorization: Bearer {accessToken}
```

### Caso 4: Ver detalles completos de un candidato

```bash
GET /api/v1/companies/candidates/45
Authorization: Bearer {accessToken}
```

### Caso 5: Ver estadísticas de candidatos

```bash
GET /api/v1/companies/me/stats
Authorization: Bearer {accessToken}
```

---

## Notas Importantes

1. **Autorización**: Solo las empresas pueden acceder a estos endpoints
2. **Filtrado automático**: La empresa solo ve candidatos de sus propias ofertas
3. **Paginación**: Por defecto muestra 10 candidatos por página
4. **Búsqueda**: El parámetro `search` busca en firstName y lastName del candidato
5. **Eventos**: Cada aplicación tiene un historial de eventos (cambios de estado)
6. **Notas**: Las empresas pueden agregar notas a las aplicaciones (ver endpoints de applications)
7. **Privacidad**: Solo se comparten los datos del perfil del estudiante, no datos sensibles del usuario

---

## Flujo Típico de Uso

1. Empresa lista sus candidatos: `GET /companies/me/candidates`
2. Filtra por estado pendiente: `GET /companies/me/candidates?status=PENDING`
3. Ve detalles de un candidato: `GET /companies/candidates/45`
4. Revisa resume, linkedin, github del candidato
5. Cambia estado de la aplicación (ver endpoints de Applications)
6. Agrega notas internas (ver endpoints de Applications)

---

## Testing con cURL

### Listar candidatos:
```bash
curl -X GET "http://localhost:3000/api/v1/companies/me/candidates?status=PENDING&page=1&limit=10" \
  -H "Authorization: Bearer {accessToken}"
```

### Ver candidato específico:
```bash
curl -X GET "http://localhost:3000/api/v1/companies/candidates/45" \
  -H "Authorization: Bearer {accessToken}"
```

### Ver estadísticas:
```bash
curl -X GET "http://localhost:3000/api/v1/companies/me/stats" \
  -H "Authorization: Bearer {accessToken}"
```

---

## Integración Frontend

### Ejemplo React - Lista de Candidatos

```jsx
import { useEffect, useState } from 'react';

function CandidatesList() {
  const [candidates, setCandidates] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1
  });

  useEffect(() => {
    fetchCandidates();
  }, [filters]);

  const fetchCandidates = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    params.append('page', filters.page);

    const response = await fetch(
      `http://localhost:3000/api/v1/companies/me/candidates?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );

    const data = await response.json();
    setCandidates(data.candidates);
  };

  return (
    <div>
      <h1>Mis Candidatos</h1>
      
      <select onChange={(e) => setFilters({...filters, status: e.target.value})}>
        <option value="">Todos los estados</option>
        <option value="PENDING">Pendientes</option>
        <option value="REVIEWING">En revisión</option>
        <option value="INTERVIEW">Entrevista</option>
      </select>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        onChange={(e) => setFilters({...filters, search: e.target.value})}
      />

      <ul>
        {candidates.map(candidate => (
          <li key={candidate.id}>
            <h3>{candidate.student.firstName} {candidate.student.lastName}</h3>
            <p>Oferta: {candidate.offer.title}</p>
            <p>Estado: {candidate.status}</p>
            <p>Aplicó: {new Date(candidate.appliedAt).toLocaleDateString()}</p>
            <a href={candidate.student.resumeUrl} target="_blank">Ver CV</a>
            <a href={`/candidates/${candidate.id}`}>Ver detalles</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
