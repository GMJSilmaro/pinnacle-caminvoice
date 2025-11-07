'use client'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  Group,
  Button,
  TextInput,
  Select,
  Text,
  ActionIcon,
  Flex,
  Card,
  Stack,
  Checkbox,
} from '@mantine/core'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  // Optional controlled pagination
  pageIndex?: number
  pageSize?: number
  onPaginationChange?: (state: PaginationState) => void
  // Row selection props
  enableRowSelection?: boolean
  getRowId?: (row: TData) => string
  onSelectionChange?: (selectedIds: string[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  onRowClick,
  isLoading = false,
  pageIndex,
  pageSize,
  onPaginationChange,
  enableRowSelection = false,
  getRowId,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const isControlled = pageIndex !== undefined || pageSize !== undefined
  const pagination: PaginationState = {
    pageIndex: pageIndex ?? internalPagination.pageIndex,
    pageSize: pageSize ?? internalPagination.pageSize,
  }
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? (updater as any)(pagination) : updater
      if (onPaginationChange) onPaginationChange(next)
      if (!isControlled) setInternalPagination(next)
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    enableRowSelection: enableRowSelection,
    getRowId: getRowId,
    onRowSelectionChange: (updater) => {
      const nextSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(nextSelection)
      
      // Update parent when selection changes
      if (onSelectionChange && getRowId) {
        // Calculate selected IDs directly from data and selection state
        // Use the data array directly since getRowId maps to the actual row IDs
        const selectedIds = data
          .map((row, index) => {
            // Find the row ID - TanStack Table uses the row index as the key when getRowId is provided
            const rowId = getRowId(row)
            // Check if this row is selected in the nextSelection state
            // The selection state uses the row ID as the key
            return nextSelection[rowId] ? rowId : null
          })
          .filter((id): id is string => id !== null)
        
        onSelectionChange(selectedIds)
      }
    },
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
      rowSelection,
    },
  })

  return (
    <Card withBorder>
      <Stack gap="md">
        {/* Search and Filters */}
        <Group justify="space-between">
          <TextInput
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            style={{ minWidth: 300 }}
          />
          
          <Group gap="sm">
            <Select
              placeholder="Page size"
              data={[
                { value: '10', label: '10 per page' },
                { value: '25', label: '25 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
              ]}
              value={pagination.pageSize.toString()}
              onChange={(value) => {
                if (value) {
                  table.setPageSize(Number(value))
                }
              }}
              w={140}
            />
          </Group>
        </Group>

        {/* Table */}
        <Table striped highlightOnHover>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {enableRowSelection && (
                  <Table.Th style={{ width: 40 }}>
                    <Checkbox
                      checked={table.getIsAllPageRowsSelected()}
                      indeterminate={table.getIsSomePageRowsSelected()}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Table.Th>
                )}
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <Group
                        gap="xs"
                        style={{
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <Text fw={600} size="sm">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </Text>
                        {header.column.getCanSort() && (
                          <div>
                            {header.column.getIsSorted() === 'asc' ? (
                              <IconArrowUp size={14} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <IconArrowDown size={14} />
                            ) : (
                              <div style={{ width: 14, height: 14 }} />
                            )}
                          </div>
                        )}
                      </Group>
                    )}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length + (enableRowSelection ? 1 : 0)}>
                  <Text ta="center" py="xl" c="dimmed">
                    Loading...
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {enableRowSelection && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </Table.Td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={columns.length + (enableRowSelection ? 1 : 0)}>
                  <Text ta="center" py="xl" c="dimmed">
                    No results found.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {/* Pagination */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} entries
          </Text>

          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronsLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            
            <Text size="sm" mx="md">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </Text>
            
            <ActionIcon
              variant="subtle"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}
