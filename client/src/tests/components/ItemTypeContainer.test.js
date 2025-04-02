import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemTypeContainer from '../../components/ItemTypeContainer';
import { fetchContainerData } from '../../api';

// Mock the API module
jest.mock('../../api', () => ({
  fetchContainerData: jest.fn()
}));

describe('ItemTypeContainer', () => {
  const defaultProps = {
    itemType: 'Parameter',
    isLoading: false,
    isBusy: false,
    isGenerating: false,
    linkingState: null,
    appConfig: { allowOnlyAdjacentConnections: true },
    localItemTypeOrder: ['Requirement', 'Parameter', 'Functions'],
    itemTypeIndex: 1,
    onAddItem: jest.fn(),
    onBulkGenerate: jest.fn(),
    onStartLinking: jest.fn(),
    onCompleteLink: jest.fn(),
    onOpenConfigPanel: jest.fn(),
    formState: { title: '', description: '' },
    setFormState: jest.fn()
  };

  const mockContainerData = {
    rootNode: [
      { 
        id: 'param1', 
        title: 'Length', 
        unit: 'mm', 
        valueType: 'number', 
        description: 'Length parameter',
        childParameterId: ['param3']
      }
    ],
    child: [
      { 
        id: 'param3', 
        title: 'Width', 
        unit: 'mm', 
        valueType: 'number'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchContainerData.mockResolvedValue(mockContainerData);
  });

  test('renders with correct title and sections', async () => {
    render(<ItemTypeContainer {...defaultProps} />);
    
    // Check header section
    expect(screen.getByText('Parameter')).toBeInTheDocument();
    expect(screen.getByText('Configure Container')).toBeInTheDocument();
    
    // Check add form section
    expect(screen.getByText('Add New Parameter')).toBeInTheDocument();
    
    // Wait for container data to load
    await waitFor(() => {
      expect(fetchContainerData).toHaveBeenCalledWith('Parameter');
    });
  });

  test('displays loading state correctly', () => {
    render(<ItemTypeContainer {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays error state correctly', async () => {
    fetchContainerData.mockRejectedValue(new Error('API error'));
    
    render(<ItemTypeContainer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
    });
  });

  test('renders item tree correctly after data loads', async () => {
    render(<ItemTypeContainer {...defaultProps} />);
    
    await waitFor(() => {
      // Root node should be shown
      expect(screen.getByText(/param1: Length/)).toBeInTheDocument();
      expect(screen.getByText(/Type: number, Unit: mm/)).toBeInTheDocument();
      expect(screen.getByText('Length parameter')).toBeInTheDocument();
      
      // Child node should be shown
      expect(screen.getByText(/param3: Width/)).toBeInTheDocument();
    });
  });

  test('handles form submission correctly', async () => {
    const onAddItem = jest.fn(e => e.preventDefault());
    
    render(<ItemTypeContainer {...defaultProps} onAddItem={onAddItem} />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'New Parameter' } });
    
    // Submit form
    fireEvent.submit(screen.getByText('Add Parameter'));
    
    expect(onAddItem).toHaveBeenCalled();
  });

  test('opens config panel when config button is clicked', async () => {
    render(<ItemTypeContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Configure Container'));
    
    expect(defaultProps.onOpenConfigPanel).toHaveBeenCalledWith('Parameter');
  });

  test('starts linking process when link button is clicked', async () => {
    render(<ItemTypeContainer {...defaultProps} />);
    
    await waitFor(() => {
      // Find link button and click it
      const linkButtons = screen.getAllByText('Link →');
      fireEvent.click(linkButtons[0]);
      
      expect(defaultProps.onStartLinking).toHaveBeenCalledWith('param1', 'Parameter');
    });
  });

  test('renders empty state when no root nodes are available', async () => {
    // Mock empty root node array
    fetchContainerData.mockResolvedValue({
      rootNode: [],
      child: []
    });
    
    render(<ItemTypeContainer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No Root Node configured')).toBeInTheDocument();
      expect(screen.getByText('This container has no Root Node to display.')).toBeInTheDocument();
    });
  });

  test('highlights container when it is a valid target for linking', () => {
    const linkingState = { fromId: 'req1', fromItemType: 'Requirement' };
    
    const { container } = render(
      <ItemTypeContainer 
        {...defaultProps} 
        linkingState={linkingState} 
      />
    );
    
    expect(container.firstChild).toHaveClass('linking-target');
  });
}); 