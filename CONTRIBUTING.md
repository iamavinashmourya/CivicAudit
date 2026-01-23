# Contributing to CivicAudit

Thank you for your interest in contributing to CivicAudit! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CivicAudit.git
   cd CivicAudit
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/iamavinashmourya/CivicAudit.git
   ```

## Development Workflow

### Branch Naming Convention
- `feature/feature-name` - For new features
- `bugfix/bug-description` - For bug fixes
- `refactor/component-name` - For code refactoring
- `docs/documentation-update` - For documentation changes

### Making Changes

1. **Create a new branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test them thoroughly

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

## Code Style

### JavaScript/Node.js
- Use ES6+ features
- Follow ESLint configuration (when added)
- Use meaningful variable and function names
- Add comments for complex logic

### Python
- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings for functions

### React/Next.js
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types validation

## Testing

Before submitting a PR, ensure:
- All existing tests pass
- New features have corresponding tests
- Code works in development environment

## Pull Request Process

1. Update README.md if needed
2. Ensure your code follows the project's code style
3. Make sure all tests pass
4. Request review from team members
5. Address any feedback

## Questions?

Feel free to open an issue for any questions or clarifications.
