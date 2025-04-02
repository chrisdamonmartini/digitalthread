/**
 * Tests for the ContainerConfigPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppContext } from '../../AppContext';
import ContainerConfigPanel from '../ContainerConfigPanel';

// Mock API calls
jest.mock('../../api', () => ({
  fetchRootNode: jest.fn(),
  updateContainerConfig: jest.fn()
}));

describe('ContainerConfigPanel', () => {
  const mockAppConfig = {
    itemType: {
      Mission: { color: '#336699', displayRootNode: [] }
    }
  };
  
  const mockSetAppConfig = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-UI-01: Saves RootNode configuration correctly', async () => {
    // Mock API responses
    const mockItems = [
      { id: 'mission-1', title: 'Test Mission 1' },
      { id: 'mission-2', title: 'Test Mission 2' }
    ];
    
    require('../../api').fetchRootNode.mockResolvedValue(mockItems);
    require('../../api').updateContainerConfig.mockResolvedValue({ success: true });
    
    // Render component
    render(
      <AppContext.Provider value={{ appConfig: mockAppConfig, setAppConfig: mockSetAppConfig }}>
        <ContainerConfigPanel
          isOpen={true}
          onClose={jest.fn()}
          itemType="Mission"
          onSave={jest.fn()}
        />
      </AppContext.Provider>
    );
    
    // Verify title is correctly displayed
    expect(screen.getByText('Container Configuration')).toBeInTheDocument();
    expect(screen.getByText('Current Root Node')).toBeInTheDocument();
    
    // Select a RootNode to add
    await waitFor(() => {
      expect(screen.getByText('-- Select a Root Node to add --')).toBeInTheDocument();
    });
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mission-1' } });
    
    // Add the RootNode
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);
    
    // Verify added to the list
    await waitFor(() => {
      expect(screen.getByText('Test Mission 1')).toBeInTheDocument();
    });
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);
    
    // Verify API called with correct data
    await waitFor(() => {
      expect(require('../../api').updateContainerConfig).toHaveBeenCalledWith(
        'Mission',
        expect.objectContaining({
          displayRootNode: ['mission-1'],
          containerColor: '#336699'
        })
      );
    });
    
    // Verify app config updated
    expect(mockSetAppConfig).toHaveBeenCalled();
  });
}); 