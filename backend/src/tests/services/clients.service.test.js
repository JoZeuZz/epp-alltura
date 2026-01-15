const ClientService = require('../../services/clients.service');
const Client = require('../../models/client');

jest.mock('../../models/client');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe crear un cliente exitosamente', async () => {
    const clientData = {
      name: 'Cliente Test S.A.',
      email: 'contacto@clientetest.com',
      phone: '+56912345678',
      address: 'Calle Falsa 123',
      specialty: 'Construcción',
    };
    Client.create.mockResolvedValue({ id: 1, ...clientData });

    const result = await ClientService.createClient(clientData);

    expect(Client.create).toHaveBeenCalledWith(clientData);
    expect(result).toMatchObject({ id: 1, name: 'Cliente Test S.A.' });
  });

  describe('deleteOrDeactivateClient', () => {
    it('debe desactivar si tiene proyectos', async () => {
      Client.delete.mockResolvedValue({ id: 1, deactivated: true });

      const result = await ClientService.deleteOrDeactivateClient(1);

      expect(Client.delete).toHaveBeenCalledWith(1);
      expect(result.deactivated).toBe(true);
      expect(result.client).toMatchObject({ id: 1, deactivated: true });
    });

    it('debe eliminar si no tiene proyectos', async () => {
      Client.delete.mockResolvedValue({ id: 1 });

      const result = await ClientService.deleteOrDeactivateClient(1);

      expect(Client.delete).toHaveBeenCalledWith(1);
      expect(result.deleted).toBe(true);
    });

    it('debe lanzar error si no existe', async () => {
      Client.delete.mockResolvedValue(null);

      await expect(ClientService.deleteOrDeactivateClient(1)).rejects.toThrow('Client not found');
    });
  });

  describe('reactivateClient', () => {
    it('debe reactivar cliente', async () => {
      Client.reactivate.mockResolvedValue({ id: 1, active: true });

      const result = await ClientService.reactivateClient(1);

      expect(Client.reactivate).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({ id: 1, active: true });
    });

    it('debe lanzar error si no existe', async () => {
      Client.reactivate.mockResolvedValue(null);

      await expect(ClientService.reactivateClient(1)).rejects.toThrow('Client not found');
    });
  });

  describe('validateUniqueName', () => {
    it('debe lanzar error si el nombre ya existe', async () => {
      Client.getByName.mockResolvedValue({ id: 2, name: 'Cliente Test' });

      await expect(ClientService.validateUniqueName('Cliente Test')).rejects.toThrow(
        'Ya existe un cliente con ese nombre'
      );
    });

    it('debe permitir nombre único', async () => {
      Client.getByName.mockResolvedValue(null);

      await expect(ClientService.validateUniqueName('Cliente Nuevo')).resolves.toBe(true);
    });
  });
});
