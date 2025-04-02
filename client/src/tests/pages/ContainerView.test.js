import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContainerView from '../../pages/ContainerView';
import { AppContext } from '../../context/AppContext';

// Mock the child components
jest.mock('../../components/ItemTypeContainer', () => {
  return function MockItemTypeContainer(props) {
    return <div data-testid={`item-type-container-${props.itemType}`}>Mock ItemTypeContainer</div>;
  };
});

jest.mock('../../components/ContainerConfigPanel', () => {
  return function MockContainerConfigPanel(props) {
    return (
      props.isOpen ? 
        <div data-testid={`config-panel-${props.itemType || 'unknown'}`}>Mock ContainerConfigPanel</div> : 
        null
    );
  };
});

describe('ContainerView', () => {
  const mockContextValue = {
    appConfig: {
      itemTypes: ['Requirement', 'Parameter', 'Functions'],
      allowOnlyAdjacentConnections: true,
      domainConfiguration: {
        Requirement: { color: '#e63946', displayName: 'Requirements' },
        Parameter: { color: '#457b9d', displayName: 'Parameters' },
        Functions: { color: '#2a9d8f', displayName: 'Functions' }
      }
    },
    refreshAppData: jest.fn()
  };

  // Mock fetch globally
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful response for fetch calls
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
  });

  test('renders the container view with title', () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerView />
      </AppContext.Provider>
    );
    
    // Check for the title
    expect(screen.getByText('Container View')).toBeInTheDocument();
  });

  test('renders item type containers based on configuration', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerView />
      </AppContext.Provider>
    );
    
    // Check that all three item type containers are rendered
    expect(screen.getByTestId('item-type-container-Requirement')).toBeInTheDocument();
    expect(screen.getByTestId('item-type-container-Parameter')).toBeInTheDocument();
    expect(screen.getByTestId('item-type-container-Functions')).toBeInTheDocument();
  });

  test('opens the config panel when a container config is requested', async () => {
    const { getByTestId } = render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerView />
      </AppContext.Provider>
    );
    
    // Simulate opening the config panel
    act(() => {
      // Call the onOpenConfigPanel prop for the first item type
      const container = getByTestId('item-type-container-Requirement');
      const props = container['__reactProps$' + Object.keys(container).find(key => key.startsWith('__reactProps$'))];
      props.onOpenConfigPanel('Requirement');
    });
    
    // Check that the config panel is opened with the correct item type
    await waitFor(() => {
      expect(screen.getByTestId('config-panel-Requirement')).toBeInTheDocument();
    });
  });
}); 