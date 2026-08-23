# Architecture

## Overview
anobystore is built using a modular architecture focusing on separation of concerns. The system is divided into several layers: Services, Commands, Events, and Data Access.

## Diagram
```mermaid
graph TD
    Client[Discord Client] --> Events[Event Handlers]
    Events --> CommandHandler[Command Handler]
    CommandHandler --> Commands[Command Modules]
    
    Commands --> MusicService[Music Service]
    Commands --> QuizService[Quiz Service]
    Commands --> AIService[AI Service]
    
    MusicService --> Lavalink[Lavalink Node]
    QuizService --> Gemini[Gemini API]
    AIService --> Gemini
    
    QuizService --> DB[(PostgreSQL)]
    Commands --> DB
```

## Layers
1. **Discord Layer:** Handles incoming events and interactions.
2. **Command Layer:** Parses user input and triggers specific logic.
3. **Service Layer:** Core business logic for Music, AI, Quiz.
4. **Data Layer:** Prisma ORM connecting to PostgreSQL/SQLite.
