# Mapeo de Campos Frontend → Backend

## Vista General

Este documento muestra cómo deben mapearse los campos de los formularios del frontend a los campos esperados por el backend en el endpoint `/auth/register`.

---

## 1. Formulario de Registro - STUDENT

### Estructura del Formulario Frontend:

```jsx
// Campos del formulario
const studentForm = {
  // Campos de autenticación (requeridos)
  email: '',
  password: '',
  role: 'STUDENT',
  
  // Campos de perfil (requeridos)
  firstName: '',
  lastName: '',
  
  // Campos de perfil (opcionales)
  phoneNumber: '',
  city: '',
  country: '',
  resumeUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  bio: '',
  skills: '',
  dateOfBirth: '',
  careerField: ''
}
```

### Mapeo al Backend:

| Campo Frontend   | Campo Backend   | Tipo    | Requerido | Validación                |
|------------------|-----------------|---------|-----------|---------------------------|
| email            | email           | string  | ✅ Sí     | Email válido              |
| password         | password        | string  | ✅ Sí     | Mínimo 6 caracteres       |
| role             | role            | string  | ✅ Sí     | "STUDENT"                 |
| firstName        | firstName       | string  | ✅ Sí     | Mínimo 1 carácter         |
| lastName         | lastName        | string  | ✅ Sí     | Mínimo 1 carácter         |
| phoneNumber      | phoneNumber     | string  | ❌ No     | -                         |
| city             | city            | string  | ❌ No     | -                         |
| country          | country         | string  | ❌ No     | -                         |
| resumeUrl        | resumeUrl       | string  | ❌ No     | URL válida o vacío        |
| linkedinUrl      | linkedinUrl     | string  | ❌ No     | URL válida o vacío        |
| githubUrl        | githubUrl       | string  | ❌ No     | URL válida o vacío        |
| bio              | bio             | string  | ❌ No     | Text area (largo)         |
| skills           | skills          | string  | ❌ No     | Text area (largo)         |
| dateOfBirth      | dateOfBirth     | string  | ❌ No     | Formato: "YYYY-MM-DD"     |
| careerField      | careerField     | string  | ❌ No     | -                         |

---

## 2. Formulario de Registro - COMPANY

### Estructura del Formulario Frontend:

```jsx
// Campos del formulario
const companyForm = {
  // Campos de autenticación (requeridos)
  email: '',
  password: '',
  role: 'COMPANY',
  
  // Campos de perfil (requeridos)
  companyName: '',
  
  // Campos de perfil (opcionales)
  industry: '',
  size: '',
  website: '',
  description: '',
  logoUrl: '',
  city: '',
  country: '',
  foundedYear: null,
  companySize: ''
}
```

### Mapeo al Backend:

| Campo Frontend   | Campo Backend   | Tipo    | Requerido | Validación                |
|------------------|-----------------|---------|-----------|---------------------------|
| email            | email           | string  | ✅ Sí     | Email válido              |
| password         | password        | string  | ✅ Sí     | Mínimo 6 caracteres       |
| role             | role            | string  | ✅ Sí     | "COMPANY"                 |
| companyName      | companyName     | string  | ✅ Sí     | Mínimo 1 carácter         |
| industry         | industry        | string  | ❌ No     | -                         |
| size             | size            | string  | ❌ No     | -                         |
| website          | website         | string  | ❌ No     | URL válida o vacío        |
| description      | description     | string  | ❌ No     | Text area (largo)         |
| logoUrl          | logoUrl         | string  | ❌ No     | URL válida o vacío        |
| city             | city            | string  | ❌ No     | -                         |
| country          | country         | string  | ❌ No     | -                         |
| foundedYear      | foundedYear     | number  | ❌ No     | Entre 1800 y año actual   |
| companySize      | companySize     | string  | ❌ No     | -                         |

---

## 3. Formulario de Registro - UNIVERSITY

### Estructura del Formulario Frontend:

```jsx
// Campos del formulario
const universityForm = {
  // Campos de autenticación (requeridos)
  email: '',
  password: '',
  role: 'UNIVERSITY',
  
  // Campos de perfil (requeridos)
  universityName: '',
  
  // Campos de perfil (opcionales)
  city: '',
  country: '',
  website: '',
  description: '',
  logoUrl: ''
}
```

### Mapeo al Backend:

| Campo Frontend     | Campo Backend     | Tipo    | Requerido | Validación            |
|--------------------|-------------------|---------|-----------|-----------------------|
| email              | email             | string  | ✅ Sí     | Email válido          |
| password           | password          | string  | ✅ Sí     | Mínimo 6 caracteres   |
| role               | role              | string  | ✅ Sí     | "UNIVERSITY"          |
| universityName     | universityName    | string  | ✅ Sí     | Mínimo 1 carácter     |
| city               | city              | string  | ❌ No     | -                     |
| country            | country           | string  | ❌ No     | -                     |
| website            | website           | string  | ❌ No     | URL válida o vacío    |
| description        | description       | string  | ❌ No     | Text area (largo)     |
| logoUrl            | logoUrl           | string  | ❌ No     | URL válida o vacío    |

---

## Ejemplo de Implementación Frontend (React)

### Formulario Dinámico Según Rol:

```jsx
import { useState } from 'react';

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'STUDENT', // o 'COMPANY', 'UNIVERSITY'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Guardar tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        // Redirigir al dashboard
      } else {
        // Mostrar error
        console.error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos comunes */}
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Password"
        required
      />
      
      <select
        name="role"
        value={formData.role}
        onChange={handleChange}
        required
      >
        <option value="STUDENT">Estudiante</option>
        <option value="COMPANY">Empresa</option>
        <option value="UNIVERSITY">Universidad</option>
      </select>

      {/* Campos específicos por rol */}
      {formData.role === 'STUDENT' && (
        <>
          <input
            type="text"
            name="firstName"
            value={formData.firstName || ''}
            onChange={handleChange}
            placeholder="Nombre"
            required
          />
          
          <input
            type="text"
            name="lastName"
            value={formData.lastName || ''}
            onChange={handleChange}
            placeholder="Apellidos"
            required
          />
          
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={handleChange}
            placeholder="Teléfono"
          />
          
          <input
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            placeholder="Ciudad"
          />
          
          <input
            type="text"
            name="country"
            value={formData.country || ''}
            onChange={handleChange}
            placeholder="País"
          />
          
          <input
            type="url"
            name="linkedinUrl"
            value={formData.linkedinUrl || ''}
            onChange={handleChange}
            placeholder="LinkedIn URL"
          />
          
          <textarea
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            placeholder="Biografía"
          />
          
          <textarea
            name="skills"
            value={formData.skills || ''}
            onChange={handleChange}
            placeholder="Habilidades (separadas por comas)"
          />
        </>
      )}

      {formData.role === 'COMPANY' && (
        <>
          <input
            type="text"
            name="companyName"
            value={formData.companyName || ''}
            onChange={handleChange}
            placeholder="Nombre de la Empresa"
            required
          />
          
          <input
            type="text"
            name="industry"
            value={formData.industry || ''}
            onChange={handleChange}
            placeholder="Industria"
          />
          
          <input
            type="url"
            name="website"
            value={formData.website || ''}
            onChange={handleChange}
            placeholder="Sitio Web"
          />
          
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Descripción de la empresa"
          />
          
          <input
            type="number"
            name="foundedYear"
            value={formData.foundedYear || ''}
            onChange={handleChange}
            placeholder="Año de Fundación"
            min="1800"
            max={new Date().getFullYear()}
          />
        </>
      )}

      {formData.role === 'UNIVERSITY' && (
        <>
          <input
            type="text"
            name="universityName"
            value={formData.universityName || ''}
            onChange={handleChange}
            placeholder="Nombre de la Universidad"
            required
          />
          
          <input
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            placeholder="Ciudad"
          />
          
          <input
            type="url"
            name="website"
            value={formData.website || ''}
            onChange={handleChange}
            placeholder="Sitio Web"
          />
          
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Descripción de la universidad"
          />
        </>
      )}

      <button type="submit">Registrarse</button>
    </form>
  );
}

export default RegisterForm;
```

---

## Validaciones Frontend (Recomendadas)

Aunque el backend valida todos los campos, es recomendable validar en el frontend para mejorar la UX:

```jsx
const validateForm = (data) => {
  const errors = {};
  
  // Email
  if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Email inválido';
  }
  
  // Password
  if (!data.password || data.password.length < 6) {
    errors.password = 'El password debe tener al menos 6 caracteres';
  }
  
  // Role-specific
  if (data.role === 'STUDENT') {
    if (!data.firstName) errors.firstName = 'El nombre es requerido';
    if (!data.lastName) errors.lastName = 'Los apellidos son requeridos';
  }
  
  if (data.role === 'COMPANY') {
    if (!data.companyName) errors.companyName = 'El nombre de la empresa es requerido';
  }
  
  if (data.role === 'UNIVERSITY') {
    if (!data.universityName) errors.universityName = 'El nombre de la universidad es requerido';
  }
  
  return errors;
};
```

---

## Manejo de Errores Frontend

```jsx
const handleAPIError = (errorData) => {
  if (errorData.error === 'User already exists with this email') {
    return 'Este email ya está registrado';
  }
  
  if (errorData.error === 'Required profile fields missing for the selected role') {
    return 'Faltan campos requeridos para este tipo de usuario';
  }
  
  if (errorData.error.includes('Invalid email')) {
    return 'El email no es válido';
  }
  
  if (errorData.error.includes('Password must be')) {
    return 'El password debe tener al menos 6 caracteres';
  }
  
  return 'Error al registrar usuario';
};
```

---

## Testing del Mapeo

### Test Case 1: Registro Student Mínimo
```json
{
  "email": "test@student.com",
  "password": "123456",
  "role": "STUDENT",
  "firstName": "Test",
  "lastName": "Student"
}
```
✅ Debe crear usuario + StudentProfile con solo firstName y lastName

### Test Case 2: Registro Student Completo
```json
{
  "email": "test@student.com",
  "password": "123456",
  "role": "STUDENT",
  "firstName": "Test",
  "lastName": "Student",
  "phoneNumber": "+34 600 000 000",
  "city": "Madrid",
  "country": "España",
  "linkedinUrl": "https://linkedin.com/in/test",
  "skills": "JavaScript, Python"
}
```
✅ Debe crear usuario + StudentProfile con todos los campos proporcionados

### Test Case 3: Registro Company
```json
{
  "email": "test@company.com",
  "password": "123456",
  "role": "COMPANY",
  "companyName": "Test Corp",
  "industry": "Tech",
  "foundedYear": 2020
}
```
✅ Debe crear usuario + CompanyProfile

### Test Case 4: Registro University
```json
{
  "email": "test@university.edu",
  "password": "123456",
  "role": "UNIVERSITY",
  "universityName": "Test University",
  "city": "Madrid"
}
```
✅ Debe crear usuario + UniversityProfile
