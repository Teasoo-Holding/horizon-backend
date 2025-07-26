# Horizon Backend

[![Build Status](https://github.com/Teasoo-Holding/horizon-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Teasoo-Holding/horizon-backend/actions/workflows/ci.yml)

![Coverage](https://raw.githubusercontent.com/Teasoo-Holding/horizon-backend/main/coverage/badge.svg)

![Coverage](https://raw.githubusercontent.com/Teasoo-Holding/horizon-backend/develop/coverage/badge.svg)

![Coverage](./coverage/badge.svg)

This repository contains the **NestJS** backend for the Horizon project.

## Overview

- Built with NestJS and TypeScript
- Uses environment variables for configuration (`.env`)
- Follows Git branching strategy with `main` (production) and `develop` (staging)
- CI/CD pipeline runs on GitHub Actions to ensure code quality, running lint, tests, and coverage
- Production deployment planned on Hostinger VPS with PM2 and Nginx reverse proxy

## Development

- Run locally with live reload:

```
npm run start:dev
```

- Build production files:

```
npm run build
```

- Run lint and tests:

```
npm run lint
npm run test
```

## Branching Strategy

- Use `develop` for staging and feature integration
- Use `main` for production-ready code and deployable releases
- Create feature branches off `develop` and submit Pull Requests for review

## CI/CD

- Automated workflow for linting, testing, and coverage reporting on push and PRs
- Deployment to production VPS planned when ready

---
