# moodle-scraper

A TypeScript library for scraping and interacting with the Moodle platform. This project provides an easy way to access course data and Moodle session management.

### Keep Session Alive (Awake Feature)

You can use the `awake` option to ensure your Moodle session doesn't expire. This will periodically send a request to Moodle to keep the heartbeat active.

```typescript
const client = new MoodleClient('https://moodle.example.com', {
  awake: true,
  awakeInterval: 1000 * 60 * 5 // Optional: check every 5 minutes (default)
});

// The heartbeat starts after a successful login() or setAuth()
await client.login('username', 'password');

// To stop the heartbeat, call logout()
client.logout();
```

## Features

- **Easy Authentication**: Supports login with username and password, along with automatic session cookie management.
- **Course Management**: Allows fetching a list of enrolled courses with complete details.
- **Course Search**: Includes functionality to search for courses across the platform.
- **TypeScript-based**: Provides strong typing support for safer and more structured development.

## Installation

Ensure you have Node.js and npm installed on your system.

```bash
npm install
```

To build the project from source:

```bash
npm run build
```

## Usage

Below is a basic example of how to use `MoodleClient` to log in and fetch a list of courses:

```typescript
import { MoodleClient } from './src';

async function main() {
  const client = new MoodleClient('https://moodle.example.com');

  try {
    // Log in to the Moodle platform
    const auth = await client.login('your_username', 'your_password');
    console.log('Login successful');

    // Fetch enrolled courses
    const courses = await client.courses.list();
    
    courses.forEach((course) => {
      console.log(`Course Name: ${course.name}`);
      console.log(`Category: ${course.category}`);
    });

    // Fetch upcoming events/assignments
    const events = await client.events.upcoming();
    console.log(`Found ${events.length} upcoming events.`);

    events.forEach((event) => {
      console.log(`Event: ${event.title}`);
      console.log(`Time: ${new Date(event.time * 1000).toLocaleString()}`);
      console.log(`Course: ${event.course_name}`);
      console.log('---');
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
```
