# Item Type Container Structure Redesign

## 1. Terminology Changes

| Current Term | New Term | Description |
|--------------|----------|-------------|
| Domain | ItemType | Refers to data types like Mission, Scenario, Requirement, Function, etc. |
| Domain Container | ItemTypeContainer | UI component that displays Root Node of a specific ItemType |
| Domain Configuration Panel | ContainerConfigPanel | UI for selecting which Root Node appears in a Container |
| Items | RootNode | Top-level node displayed in a container from which the hierarchy is built |

## 2. Component Structure

### 2.1 ItemTypeContainer
- Displays a collection of RootNode of a specific ItemType
- Shows direct child of those RootNode in a hierarchical view
- Provides navigation and interaction with the displayed item
- Handles empty state (no data) gracefully with appropriate messaging and UI

### 2.2 ContainerConfigPanel
- Allows selection of RootNode to display in a container
- Configures visual setting for the container (color, etc.)
- Manages display preference like "Show Top-Level Node Only"

## 3. Data Flow Optimization

### 3.1 Current Implementation
- Fetches ALL item of an ItemType
- Filters client-side to display only RootNode and their child

### 3.2 Target Implementation
- Create API endpoint that returns only RootNode and their direct child
- Improve performance by reducing data transfer and processing
- Support empty state (no data) use case with appropriate response format

## 4. API Changes

### 4.1 New Endpoint
- `/api/itemtype/:itemtype/rootnode` - Get configured RootNode for an ItemType
- `/api/config/container-display/:itemtype` - Get/update container display configuration

### 4.2 Response Structure
```javascript
// GET /api/itemtype/:itemtype/rootnode
{
  "rootNode": [
    {
      "id": "mission-123",
      "title": "Example Mission",
      "description": "...",
      "childMissionId": ["child-id-1", "child-id-2"]
    },
    // Other root nodes
  ],
  "child": [
    {
      "id": "child-id-1",
      "title": "Child Item 1",
      "description": "..."
      // Other properties
    },
    // Other children
  ]
}

// Empty state response
{
  "rootNode": [],
  "child": []
}
```

## 5. UI Updates

### 5.1 ContainerConfigPanel
- Update title from "Domain Configuration" to "Container Configuration"
- Change "Current Configuration" to "Current Root Node"
- Change "Add Items" to "Add Root Node"
- Change "Show Top-Level Items Only" to "Show Top-Level Node Only"

### 5.2 Main Application
- Update reference to "domain" to "itemtype" where appropriate
- Ensure consistent terminology throughout UI
- Add clear empty state handling with helpful messaging

## 6. Code Refactoring

### 6.1 File Renaming
- `DomainConfigPanel.js` → `ContainerConfigPanel.js`
- `DomainColumn.js` → `ItemTypeContainer.js`

### 6.2 Variable Naming
- `domainName` → `itemType` (singular)
- `domains` → `itemType` (still singular when used as a type)
- `DOMAIN_CONFIG` → `ITEM_TYPE_CONFIG`
- All array variables to use singular naming for consistency:
  - `items` → `item`
  - `rootNodes` → `rootNode`
  - `children` → `child`

### 6.3 Empty State Handling
- Add comprehensive empty state handling in all components
- Provide user-friendly messages when no data exists
- Include helpful actions for users to create initial data

## 7. Future Considerations

### 7.1 Child Reference Consistency
- Consider refactoring domain-specific child references (e.g., `childMissionId`) to a consistent pattern
- Options include:
  - Generic `child` array with type information
  - Typed child map (`childByType`)

### 7.2 Domain Integration
- Introduce actual "Domain" concept (e.g., Aircraft, Shipboard) that organizes ItemType
- Allow ItemType to be shared across multiple Domain with domain-specific configuration

## 8. Implementation Approach

1. Rename component and update terminology in UI
2. Implement new API endpoint for optimized data loading
3. Update front-end to use new endpoint
4. Add robust empty state handling
5. Migrate data or prepare for fresh start with new structure
6. Refactor child reference pattern (later phase)
7. Add domain concept (later phase)

## 9. Success Metrics

- Reduced data transfer size when loading container
- Improved page load and interaction performance
- Consistent terminology usage throughout the application
- Simplified code for managing container display
- Intuitive empty state handling for new user 

## 10. Detailed Implementation Plan

### Phase 1: Backend API Development

#### Step 1: Create New API Endpoints
1. Create `/api/itemtype/:itemtype/rootnode` endpoint
2. Update `/api/config/container-display/:itemtype` endpoint
3. Implement empty state handling in both endpoints

#### Step 2: Data Structure Transformation
1. Create utility functions to transform existing data to new format
2. Implement data validation for the new structure
3. Add logging for tracking API performance metrics

### Phase 2: Front-End Component Renaming & Refactoring

#### Step 3: Clone and Rename Core Components
1. Clone `DomainConfigPanel.js` to `ContainerConfigPanel.js`
2. Clone `DomainColumn.js` to `ItemTypeContainer.js`
3. Update imports in dependent files to use new components

#### Step 4: Update Variable Names
1. Refactor variable names in the new components
2. Update all references to renamed variables
3. Ensure consistent naming patterns across components

### Phase 3: UI Terminology Updates

#### Step 5: Update UI Text and Labels
1. Change all user-facing text using the new terminology
2. Update form labels, headings, and button text
3. Add tooltips explaining new terms where needed

#### Step 6: Implement Empty State UI
1. Create empty state UI components for each container
2. Add helpful messaging for new users
3. Implement UI for first-time setup actions

### Phase 4: Integration and Testing

#### Step 7: Connect Front-End to New APIs
1. Update data fetching logic to use new endpoints
2. Implement optimized data loading patterns
3. Add appropriate error handling and fallbacks

#### Step 8: Testing and Validation
1. Verify all functionality works with the new implementation
2. Measure and validate performance improvements
3. Ensure backward compatibility where needed

### Phase 5: Cleanup and Documentation

#### Step 9: Remove Legacy Code
1. Deprecate old components and endpoints
2. Remove unused code and variables
3. Clean up any temporary migration code

#### Step 10: Documentation and Knowledge Transfer
1. Update all documentation with new terminology
2. Create developer guides for the new structure
3. Document the migration process for future reference

## 11. Test Cases

### 11.1 API Test Cases

#### TC-API-01: RootNode Retrieval
- **Description**: Verify the new API returns correct RootNode data
- **Steps**:
  1. Configure test ItemType with known RootNode
  2. Call `/api/itemtype/:itemtype/rootnode` endpoint
  3. Verify response structure matches specification
- **Expected Result**: API returns correct RootNode and their child
- **Acceptance Criteria**: Response matches expected format and contains all configured RootNode

#### TC-API-02: Empty State Handling
- **Description**: Verify API handles empty state correctly
- **Steps**:
  1. Configure test ItemType with no RootNode
  2. Call `/api/itemtype/:itemtype/rootnode` endpoint
- **Expected Result**: API returns valid empty response (`{ "rootNode": [], "child": [] }`)
- **Acceptance Criteria**: No errors thrown, empty arrays returned

#### TC-API-03: Container Configuration Update
- **Description**: Verify container configuration can be updated
- **Steps**:
  1. Send PUT request to `/api/config/container-display/:itemtype`
  2. Verify configuration is saved correctly
  3. Retrieve configuration to confirm changes
- **Expected Result**: Configuration updates are persisted
- **Acceptance Criteria**: Retrieved configuration matches what was saved

### 11.2 UI Test Cases

#### TC-UI-01: ContainerConfigPanel Functionality
- **Description**: Verify Container Configuration panel works correctly
- **Steps**:
  1. Open Container Configuration for an ItemType
  2. Add RootNode to configuration
  3. Save changes
  4. Reopen panel to verify persistence
- **Expected Result**: RootNode selections are saved and displayed correctly
- **Acceptance Criteria**: Selected RootNode appear in configuration after reopening

#### TC-UI-02: ItemTypeContainer Display
- **Description**: Verify container correctly displays configured RootNode
- **Steps**:
  1. Configure RootNode for an ItemType
  2. View the ItemTypeContainer
  3. Verify only configured RootNode and their direct child are shown
- **Expected Result**: Container shows correct hierarchy
- **Acceptance Criteria**: Only selected RootNode and their child are displayed

#### TC-UI-03: Empty State UI
- **Description**: Verify empty state UI is shown when no data exists
- **Steps**:
  1. Clear all data for an ItemType
  2. View the ItemTypeContainer
- **Expected Result**: Helpful empty state message is displayed
- **Acceptance Criteria**: UI provides clear guidance on next steps

### 11.3 Performance Test Cases

#### TC-PERF-01: Data Transfer Optimization
- **Description**: Verify reduced data transfer compared to old implementation
- **Steps**:
  1. Measure data transfer size with old implementation
  2. Measure data transfer size with new implementation
  3. Compare results
- **Expected Result**: New implementation transfers significantly less data
- **Acceptance Criteria**: At least 40% reduction in data transfer size

#### TC-PERF-02: Rendering Performance
- **Description**: Verify improved rendering performance
- **Steps**:
  1. Measure rendering time with old implementation
  2. Measure rendering time with new implementation
  3. Compare results
- **Expected Result**: New implementation renders faster
- **Acceptance Criteria**: At least 30% reduction in rendering time

### 11.4 Regression Test Cases

#### TC-REG-01: Linking Functionality
- **Description**: Verify item linking still works with new implementation
- **Steps**:
  1. Create link between items in different ItemType containers
  2. Verify link is displayed correctly
  3. Verify link data is saved correctly
- **Expected Result**: Linking functionality works as before
- **Acceptance Criteria**: No regression in link creation or display

#### TC-REG-02: CRUD Operations
- **Description**: Verify Create/Read/Update/Delete operations work
- **Steps**:
  1. Create new item in an ItemType
  2. Update the item
  3. Delete the item
  4. Verify each operation succeeds
- **Expected Result**: CRUD operations work as before
- **Acceptance Criteria**: No regression in item management functionality 