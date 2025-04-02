import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContainerConfigPanel from '../../components/ContainerConfigPanel';
import { AppContext } from '../../context/AppContext';

// Mock the fetch API
global.fetch = jest.fn();

describe('ContainerConfigPanel', () => {
  // Mock context data
  const mockContextValue = {
    domainConfiguration: {
      itemTypes: ['Requirement', 'Parameter', 'Functions']
    },
    refreshAppData: jest.fn()
  };

  // Default props
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    itemType: 'Parameter'
  };

  // Mock API responses
  const mockAvailableItems = [
    { id: 'param1', title: 'Length' },
    { id: 'param2', title: 'Width' },
    { id: 'param3', title: 'Height' }
  ];

  const mockConfig = {
    rootNodeIds: ['param1'],
    displaySettings: {
      backgroundColor: '#f5f5f5',
      textColor: '#333333',
      borderColor: '#cccccc'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful responses
    global.fetch.mockImplementation((url) => {
      if (url === '/api/item-types/Parameter') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAvailableItems)
        });
      }
      
      if (url === '/api/item-types/Parameter/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig)
        });
      }
      
      if (url.includes('/config') && url.includes('PUT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      
      return Promise.reject(new Error(`Unhandled fetch for URL: ${url}`));
    });
  });

  test('renders component when open', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    // Check if the panel title is displayed
    expect(screen.getByText('Container Configuration')).toBeInTheDocument();
    
    // Check if the item type is displayed
    expect(screen.getByText('Item Type: Parameter')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/item-types/Parameter');
      expect(global.fetch).toHaveBeenCalledWith('/api/item-types/Parameter/config');
    });
  });

  test('loads and displays current root nodes', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      // Should show the current root node (param1)
      expect(screen.getByText('Length (param1)')).toBeInTheDocument();
    });
  });

  test('loads and displays available items', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      // Should show available items in dropdown
      const selectElem = screen.getByLabelText('Add Root Node:');
      expect(selectElem).toBeInTheDocument();
      
      // All three items should be available in the options
      const options = Array.from(selectElem.options).map(option => option.text);
      expect(options).toContain('Width (param2)');
      expect(options).toContain('Height (param3)');
    });
  });

  test('can add a new root node', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      const selectElem = screen.getByLabelText('Add Root Node:');
      fireEvent.change(selectElem, { target: { value: 'param2' } });
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      // The new rootNodeIds array should now include both param1 and param2
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item-types/Parameter/config',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"rootNodeIds":["param1","param2"]')
        })
      );
    });
  });

  test('can remove a root node', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);
      
      // The rootNodeIds array should now be empty
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item-types/Parameter/config',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"rootNodeIds":[]')
        })
      );
    });
  });

  test('can update display settings', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      // Change the background color
      const bgColorInput = screen.getByLabelText('Background Color:');
      fireEvent.change(bgColorInput, { target: { value: '#ff0000' } });
      
      // Save the changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Check that the PUT request was made with the updated colors
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/item-types/Parameter/config',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"backgroundColor":"#ff0000"')
        })
      );
    });
  });

  test('displays error message on API failure', async () => {
    // Mock a failed API response
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  test('closes panel when close button is clicked', () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} isOpen={false} />
      </AppContext.Provider>
    );
    
    // The container should be empty or only have CSS classes for closed state
    expect(container.firstChild).toHaveClass('container-config-panel');
    expect(container.firstChild).not.toHaveClass('open');
  });

  test('shows success message after saving changes', async () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <ContainerConfigPanel {...defaultProps} />
      </AppContext.Provider>
    );
    
    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Changes saved successfully!')).toBeInTheDocument();
    });
    
    // Verify app data refresh was called
    expect(mockContextValue.refreshAppData).toHaveBeenCalled();
  });
}); 