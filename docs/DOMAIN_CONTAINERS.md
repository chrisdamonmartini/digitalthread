# Domain Containers (Implemented by `DomainColumn.js`)

## Overview

Domain Containers, implemented primarily by the `DomainColumn.js` component, represent the distinct domains within the Digital Thread Application (e.g., Mission, Scenario, Requirements). Each container serves as a visual column displaying items of a specific domain and providing functionalities for adding, viewing, and linking these items.

## Structure and Components

Each Domain Container (`DomainColumn`) consists of the following sections:

1.  **Header:**
    *   Displays the name of the domain (e.g., "Mission", "Scenario") using an `<h2>` tag.

2.  **Add Item Form:**
    *   A form dedicated to adding a single new item to the domain.
    *   The fields within the form are dynamically rendered based on the specific `domainName` (e.g., Title/Description for Mission/Scenario/Requirements; Title/Unit/Value Type/Description for Parameter; Title/Type/Description for Functions).
    *   Includes a submit button (e.g., "Add Mission").
    *   Form inputs and the submit button are disabled during loading or busy states (`isBusy`, `isLoading`).

3.  **Bulk Generate Form:**
    *   A separate form component (`BulkGenerateFormComponent`) used to create multiple items at once.
    *   Allows specifying the number of items, minimum/maximum sub-items (if applicable), and a prefix.
    *   Includes a submit button (e.g., "Generate Missions").
    *   Form inputs and the submit button are disabled during busy or generation states (`isBusy`, `isGenerating`).

4.  **Item List (`<div class="item-list">`):**
    *   Displays the list of items belonging to the domain.
    *   Shows a "Loading..." message when data is being fetched (`isLoading`).
    *   Shows a "No [Domain Name]s found." message if the list is empty after loading.
    *   Renders each item within an `<li class="item-card">`.

## Item Representation (`<li class="item-card">`)

Each item within the list is displayed with the following details:

*   **Identifier & Title:** Shown as "**{item.id}: {item.title}**".
*   **Domain-Specific Details:**
    *   **Parameter:** Displays "Type: {item.valueType}, Unit: {item.unit}" if available.
    *   **Functions:** Displays "Type: {item.functionType}" if available.
*   **Description:** Displays `item.description` if available.
*   **Link Button:** A "Link →" button is shown if no linking operation is currently active (`!linkingState.fromId`). This button initiates the linking process for that item (`onStartLinking`).

## Key Functionalities

1.  **Adding Items:** Users can add individual items through the domain-specific "Add Item Form". The `onAddItem` handler (passed from `App.js`) manages the creation logic.

2.  **Bulk Generating Items:** Users can create multiple items using the "Bulk Generate Form". The `onBulkGenerate` handler manages this process.

3.  **Linking Items:**
    *   **Initiation:** Clicking the "Link →" button on an item calls `onStartLinking`, setting the `linkingState` in `App.js` with the source item's ID and domain.
    *   **Target Identification:**
        *   Based on `linkingState` and `appConfig.allowOnlyAdjacentConnections`, the component determines if it's a valid target column.
        *   Valid target columns get the `linking-target` CSS class for visual feedback (e.g., dashed border).
    *   **Link Completion:**
        *   Within a target column, individual items are checked for compatibility (e.g., Mission links to Scenario, Scenario links to Requirements).
        *   Valid target items get the `clickable-target` CSS class (e.g., border highlight, pointer cursor).
        *   Clicking a valid target item calls `onCompleteLink` (passed from `App.js`) with the target item's ID and domain to finalize the link.

## State Handling

The `DomainColumn` component relies heavily on props passed down from `App.js` for its state and behavior:

*   **Data:** `domainName`, `items`, `appConfig`, `localDomainOrder`, `domainIndex`.
*   **State Indicators:** `isLoading`, `isBusy`, `isGenerating`, `linkingState`.
*   **Form State:** Various state variables for the input fields of Add/Bulk forms (e.g., `newMissionTitle`, `numMissions`).
*   **Handlers:** Functions to manage actions (`onAddItem`, `onBulkGenerate`, `onStartLinking`, `onCompleteLink`).

## Visual Styling

*   Uses CSS classes like `domain-column`, `item-list`, `item-card`, `link-button`.
*   Applies `linking-target` and `clickable-target` classes during linking operations for visual feedback.
*   Domain-specific styling (like colors) is not directly handled within this component but relies on parent components or global CSS.

## Container Structure

### Visual Components

1. **Header Section**
   - Domain title (e.g., "Mission", "Scenario")
   - Domain-specific icon
   - **Collapse/Expand Toggle**
     - A clickable chevron icon (▼/▶) that would allow users to minimize or maximize the container
     - When collapsed, the container would show only the header and hide the content area
     - When expanded, the full container with all items would be visible
     - Would maintain all connections even when collapsed
   - **Item Count Indicator**
     - Would display the total number of items in the container (e.g., "5 items")
     - Would update automatically when items are added or removed
     - Would remain visible even when the container is collapsed
     - Would help users track the size of each domain at a glance

2. **Content Area**
   - Scrollable item list
   - Individual item cards
   - Add item button (when applicable)
   - Empty state messaging

3. **Container Styling**
   - Domain-specific color scheme
   - Consistent padding and margins
   - Responsive width handling
   - Clear visual boundaries

## Item Cards

Each item within a domain container is represented by a card that displays:

1. **Standard Information**
   - Item ID
   - Title
   - Description (truncated if necessary)
   - Status indicators

2. **Interactive Elements**
   - Connection points for relationship lines
   - Selection highlighting
   - Drag handle for reordering
   - Action buttons (edit, delete, etc.)

## Interaction Features

### 1. Connection Management

- **Connection Points**
  - Visible on hover
  - Clear indication of valid connection points
  - Visual feedback during connection creation

- **Connection Rules**
  - Respect `allowOnlyAdjacentConnections` setting
  - Validate domain relationship rules
  - Prevent invalid connections

### 2. Item Management

- **Drag and Drop**
  - Reorder items within container
  - Smooth animation during movement
  - Visual feedback during drag

- **Selection**
  - Single item selection
  - Multi-item selection (with modifier keys)
  - Clear visual indication of selected state

### 3. Container Controls

- **Collapse/Expand**
  - Smooth animation
  - Maintains connections
  - Preserves state during session

- **Resize Handling**
  - Responsive to window size changes
  - Maintains readability
  - Preserves layout integrity

## Styling Guidelines

### 1. Container Theme

```css
/* Example of container styling structure */
.domainContainer {
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: white;
  margin: 8px;
  min-width: 280px;
  max-width: 400px;
}

.domainHeader {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.domainContent {
  padding: 8px;
  max-height: 600px;
  overflow-y: auto;
}
```

### 2. Color Schemes

Each domain maintains its specific color while adhering to the application's color palette:

- Mission: #14364F
- Scenario: #1E5288
- Requirements: #2E71B8
- Parameter: #3D8FE8
- Functions: #4CADF6

## State Management

### 1. Container State

```typescript
interface DomainContainerState {
  isExpanded: boolean;
  selectedItems: string[];
  isConnecting: boolean;
  connectionSource?: string;
  visibleItems: DomainItem[];
}
```

### 2. Item State

```typescript
interface DomainItem {
  id: string;
  title: string;
  description: string;
  connections: {
    incoming: Connection[];
    outgoing: Connection[];
  };
  isSelected: boolean;
  isHighlighted: boolean;
}
```

## Performance Considerations

1. **Rendering Optimization**
   - Virtualized scrolling for large item lists
   - Memoized item components
   - Efficient connection line updates

2. **State Updates**
   - Batched state updates
   - Optimized re-renders
   - Efficient connection management

3. **Event Handling**
   - Debounced resize events
   - Throttled scroll handlers
   - Optimized drag and drop operations

## Best Practices

1. **Container Management**
   - Maintain consistent spacing between containers
   - Ensure clear visual hierarchy
   - Provide clear feedback for user actions

2. **Connection Handling**
   - Clear visual feedback during connection creation
   - Validate connections in real-time
   - Maintain connection visibility during container operations

3. **User Experience**
   - Smooth animations for state changes
   - Clear visual feedback for all interactions
   - Consistent behavior across all domain types

## Error Handling

1. **Connection Errors**
   - Clear error messages for invalid connections
   - Visual indication of connection constraints
   - Graceful error recovery

2. **State Errors**
   - Fallback states for missing data
   - Recovery mechanisms for corrupt state
   - Clear error boundaries

## Accessibility

1. **Keyboard Navigation**
   - Full keyboard support for all operations
   - Clear focus indicators
   - Logical tab order

2. **Screen Readers**
   - Meaningful ARIA labels
   - Clear state announcements
   - Proper heading structure

3. **Visual Accessibility**
   - Sufficient color contrast
   - Clear visual hierarchies
   - Resizable text support 