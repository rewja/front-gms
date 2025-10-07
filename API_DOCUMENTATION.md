# GAMS API Documentation

## Overview
The General Affairs Management System (GAMS) provides a comprehensive REST API for managing todos, users, requests, meetings, assets, and visitors.

## Base URL
```
http://localhost:8000/api
```

## Authentication
All API endpoints require authentication using Laravel Sanctum tokens.

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

## Endpoints

### Authentication

#### POST /login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "category": "ob"
    },
    "token": "1|abc123..."
  }
}
```

#### POST /logout
Logout user and revoke token.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Todos

#### GET /todos
Get all todos for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `date` (optional): Filter by date
- `search` (optional): Search in title and description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Complete project",
      "description": "Finish the project documentation",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2024-01-15",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "user@example.com"
      }
    }
  ]
}
```

#### POST /todos
Create a new todo.

**Request Body:**
```json
{
  "title": "New Todo",
  "description": "Todo description",
  "priority": "medium",
  "due_date": "2024-01-15",
  "target_start_at": "09:00",
  "target_end_at": "17:00",
  "todo_type": "rutin",
  "target_category": "all"
}
```

#### PATCH /todos/{id}
Update a todo.

**Request Body:**
```json
{
  "title": "Updated Todo",
  "description": "Updated description",
  "priority": "high",
  "status": "in_progress"
}
```

#### DELETE /todos/{id}
Delete a todo.

**Response:**
```json
{
  "success": true,
  "message": "Todo deleted successfully"
}
```

#### PATCH /todos/{id}/start
Start a todo.

#### PATCH /todos/{id}/hold
Hold a todo.

#### PATCH /todos/{id}/complete
Complete a todo.

#### POST /todos/{id}/submit
Submit todo for checking with evidence.

**Request Body:**
```multipart/form-data
{
  "evidence": file
}
```

### Users

#### GET /users
Get all users (admin only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "category": "ob",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /users
Create a new user (admin only).

**Request Body:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password",
  "role": "user",
  "category": "ob"
}
```

#### PATCH /users/{id}
Update a user (admin only).

#### DELETE /users/{id}
Delete a user (admin only).

### Requests

#### GET /requests
Get all requests (admin only).

#### GET /requests/mine
Get current user's requests.

#### POST /requests
Create a new request.

**Request Body:**
```json
{
  "item_name": "Office Chair",
  "description": "Ergonomic office chair",
  "category": "furniture",
  "quantity": 1,
  "estimated_cost": 500
}
```

#### PATCH /requests/{id}/approve
Approve a request (admin only).

**Request Body:**
```json
{
  "ga_note": "Approved for purchase"
}
```

#### PATCH /requests/{id}/reject
Reject a request (admin only).

### Meetings

#### GET /meetings
Get all meetings.

#### POST /meetings
Create a new meeting.

**Request Body:**
```json
{
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "room": "Conference Room A",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T11:00:00Z"
}
```

#### PATCH /meetings/{id}
Update a meeting.

#### DELETE /meetings/{id}
Delete a meeting.

### Assets

#### GET /assets
Get all assets.

#### POST /assets
Create a new asset (admin only).

**Request Body:**
```json
{
  "name": "Dell Laptop",
  "description": "Dell Inspiron 15",
  "category": "it",
  "condition": "good",
  "acquisition_method": "purchase",
  "acquisition_date": "2024-01-01",
  "cost": 800
}
```

#### PATCH /assets/{id}
Update an asset.

#### DELETE /assets/{id}
Delete an asset.

### Visitors

#### GET /visitors
Get all visitors (admin only).

#### POST /visitors
Create a new visitor.

**Request Body:**
```json
{
  "name": "John Smith",
  "company": "ABC Corp",
  "purpose": "Business meeting",
  "visit_date": "2024-01-15",
  "check_in_time": "09:00",
  "check_out_time": "17:00"
}
```

#### PATCH /visitors/{id}/checkout
Check out a visitor.

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

API requests are rate limited to 60 requests per minute per user.

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 15, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 75
  }
}
```

## Filtering and Searching

Most list endpoints support filtering and searching:

**Query Parameters:**
- `search` - Search term
- `status` - Filter by status
- `category` - Filter by category
- `date_from` - Filter from date
- `date_to` - Filter to date

## File Uploads

File uploads use multipart/form-data:

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```
field_name: file
```

## Webhooks

GAMS supports webhooks for real-time notifications:

### Available Events
- `todo.created`
- `todo.updated`
- `todo.completed`
- `request.approved`
- `request.rejected`
- `meeting.created`
- `meeting.cancelled`

### Webhook Payload
```json
{
  "event": "todo.created",
  "data": {
    "id": 1,
    "title": "New Todo",
    "user_id": 1
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Get todos
const todos = await api.get('/todos');

// Create todo
const newTodo = await api.post('/todos', {
  title: 'New Todo',
  description: 'Description',
  priority: 'medium'
});
```

### PHP
```php
$client = new GuzzleHttp\Client([
    'base_uri' => 'http://localhost:8000/api',
    'headers' => [
        'Authorization' => 'Bearer ' . $token,
        'Content-Type' => 'application/json'
    ]
]);

// Get todos
$response = $client->get('/todos');
$todos = json_decode($response->getBody(), true);
```

## Testing

API endpoints can be tested using the provided Postman collection:
- `Company Management API (merged).postman_collection.json`
- `Integrated GA Management API.postman_collection.json`

## Support

For API support, please contact the development team or create an issue in the project repository.



