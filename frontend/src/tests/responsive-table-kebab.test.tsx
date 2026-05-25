import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveTable } from '@jozeuzz/alltura-ui';

const columns = [
  { key: 'name' as const, header: 'Nombre' },
  { key: 'role' as const, header: 'Rol', hideOnMobile: true },
];
const data = [
  { name: 'Juan', role: 'admin' },
  { name: 'María', role: 'supervisor' },
];

describe('ResponsiveTable mobileKebab', () => {
  it('renders kebab button per row when mobileKebab is provided', () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={data}
        getRowKey={(_, i) => i}
        mobileKebab={() => [
          { label: 'Editar', onClick: vi.fn() },
          { label: 'Eliminar', onClick: vi.fn(), variant: 'danger' as const },
        ]}
      />
    );
    expect(screen.getAllByRole('button', { name: /Opciones de fila/ })).toHaveLength(2);
  });

  it('shows action items when kebab button is clicked', () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={[data[0]]}
        getRowKey={(_, i) => i}
        mobileKebab={() => [
          { label: 'Editar', onClick: vi.fn() },
          { label: 'Eliminar', onClick: vi.fn(), variant: 'danger' as const },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Opciones de fila/ }));
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={[data[0]]}
        getRowKey={(_, i) => i}
        mobileKebab={() => [{ label: 'Editar', onClick: vi.fn() }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Opciones de fila/ }));
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('calls action onClick and closes dropdown on item click', () => {
    const onEdit = vi.fn();
    render(
      <ResponsiveTable
        columns={columns}
        data={[data[0]]}
        getRowKey={(_, i) => i}
        mobileKebab={() => [{ label: 'Editar', onClick: onEdit }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Opciones de fila/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
