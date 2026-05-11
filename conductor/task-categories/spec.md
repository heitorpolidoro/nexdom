# Specification: Task Categorization

## Problem
Currently, tasks in SIGECON are not categorized, making it difficult for users to organize their work by department, project, or nature (e.g., "Jurídico", "Contrato", "Ocorrências"). As the number of tasks grows, filtering by assignee or status is not sufficient for high-level organization.

## Audience
- **Administrators**: Responsible for managing the set of available categories.
- **Directors**: Users who create and manage tasks, needing to categorize them for better visibility and reporting.

## Success Criteria
- **Centralized Management**: Administrators can create, update, and deactivate categories (Name and Color).
- **Mandatory Association**: Every task must be linked to exactly one category.
- **Visual Distinction**: Tasks in the board and list views must clearly display their category name/color.
- **Advanced Filtering**: Users can filter the dashboard by category.
- **Data Integrity**: Deleting a category should be restricted if tasks are still linked to it (or handled via soft-delete/archiving).

## Constraints
- **RBAC**: Only users with the `ADMINISTRATOR` role can perform CRUD operations on the `Category` entity.
- **Migration**: Existing tasks must be assigned a "General" category during migration.
- **Performance**: Filtering by category must be indexed in the database.

## User Stories
1. **As an Admin**, I want to create a "Jurídico" category with a blue color, so that tasks of this nature can be identified.
2. **As a Director**, I want to select a category when creating a task, so it is properly organized.
3. **As a Director**, I want to filter my dashboard to see only "Contrato" tasks, so I can focus on my current priority.
4. **As any user**, I want to see a color badge on each task card indicating its category, for quick visual recognition.
