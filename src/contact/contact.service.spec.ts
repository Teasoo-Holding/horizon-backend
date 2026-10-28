import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { DemoRequestDto } from './demo-request.dto';

describe('ContactService', () => {
  let service: ContactService;

  const mockPrismaService = {
    contactRequest: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockEmailService = { sendEmail: jest.fn() };

  const dto: DemoRequestDto = {
    requestType: 'demo',
    firstName: 'Ada',
    lastName: 'Obi',
    email: 'ada@example.com',
    organization: 'Acme',
    industry: 'Energy',
  };

  // Let the fire-and-forget notification chain settle
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.contactRequest.create.mockResolvedValue({ id: 'req_1' });
    mockPrismaService.contactRequest.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  it('saves the request and succeeds when emails send', async () => {
    mockEmailService.sendEmail.mockResolvedValue({ success: true });

    await expect(service.submitDemoRequest(dto)).resolves.toEqual({ success: true });
    await flush();

    expect(mockPrismaService.contactRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ requestType: 'demo', email: 'ada@example.com' }),
    });
    expect(mockPrismaService.contactRequest.update).toHaveBeenCalledWith({
      where: { id: 'req_1' },
      data: { emailStatus: 'sent' },
    });
  });

  it('still succeeds and records the failure when the email fails', async () => {
    mockEmailService.sendEmail.mockResolvedValue({ success: false, error: 'unrecognised IP address' });

    await expect(service.submitDemoRequest(dto)).resolves.toEqual({ success: true });
    await flush();

    expect(mockPrismaService.contactRequest.update).toHaveBeenCalledWith({
      where: { id: 'req_1' },
      data: { emailStatus: 'failed', emailError: 'unrecognised IP address' },
    });
  });

  it('fails without sending emails when the request cannot be saved', async () => {
    mockPrismaService.contactRequest.create.mockRejectedValue(new Error('db down'));

    await expect(service.submitDemoRequest(dto)).resolves.toEqual({ success: false });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });
});
