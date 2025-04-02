/**
 * Tests for the ItemTypeContainer component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ItemTypeContainer from '../ItemTypeContainer';

// Mock API calls
jest.mock('../../api', () => ({
  fetchContainerData: jest.fn()
}));

describe('ItemTypeContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-UI-02: Displays RootNode and their direct child correctly', async () => {
    // Mock API response with RootNode and child
    const mockData = {
      rootNode: [
        { 
          id: 'mission-1', 
          title: 'Root Mission 1', 
          description: 'Test description',
          childMissionId: ['child-1', 'child-2']
        }
      ],
      child: [
        { id: 'child-1', title: 'Child Mission 1' },
        { id: 'child-2', title: 'Child Mission 2' }
      ]
    };
    
    require('../../api').fetchContainerData.mockResolvedValue(mockData);
    
    // Render component
    render(
      <ItemTypeContainer 
        itemType="Mission"
        isLoading={false}
      />
    );
    
    // Verify data is displayed correctly
    await waitFor(() => {
      expect(screen.getByText('Root Mission 1')).toBeInTheDocument();
      expect(screen.getByText('Child Mission 1')).toBeInTheDocument();
      expect(screen.getByText('Child Mission 2')).toBeInTheDocument();
    });
  });

  test('TC-UI-03: Displays empty state message when no data exists', async () => {
    // Mock empty API response
    const emptyData = {
      rootNode: [],
      child: []
    };
    
    require('../../api').fetchContainerData.mockResolvedValue(emptyData);
    
    // Render component
    render(
      <ItemTypeContainer 
        itemType="Mission"
        isLoading={false}
      />
    );
    
    // Verify empty state is displayed
    await waitFor(() => {
      expect(screen.getByText(/No Root Node configured/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Your First Root Node/i })).toBeInTheDocument();
    });
  });
}); 