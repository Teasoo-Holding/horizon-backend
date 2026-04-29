import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminBillingService } from './billing.service';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';
import { 
  BillingStatsResponse, 
  SubscriptionListItem, 
  CreateSubscriptionDto, 
  UpdateSubscriptionDto, 
  CreateInvoiceDto, 
  UpdateInvoiceStatusDto 
} from '../dto/admin-billing.dto';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly billingService: AdminBillingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get billing dashboard statistics' })
  @ApiResponse({ status: 200, type: BillingStatsResponse })
  async getStats() {
    return this.billingService.getBillingStats();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get paginated list of company subscriptions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sector', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async getSubscriptions(@Query() query: any) {
    return this.billingService.getSubscriptions(query);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Manual entry: Create a new company subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @GetUserDecorator('id') adminId: number
  ) {
    return this.billingService.createSubscription(dto, adminId);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Update/Manage a company subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  async updateSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionDto,
    @GetUserDecorator('id') adminId: number
  ) {
    return this.billingService.updateSubscription(id, dto, adminId);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Remove a subscription record' })
  @ApiResponse({ status: 200, description: 'Subscription deleted' })
  async deleteSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.deleteSubscription(id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get list of payment records (invoices)' })
  @ApiQuery({ name: 'company_id', required: false, type: Number })
  async getInvoices(@Query('company_id') companyId?: number) {
    return this.billingService.getInvoices(companyId);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Manual entry: Record an offline payment' })
  @ApiResponse({ status: 201, description: 'Invoice recorded' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Invoice status updated' })
  async updateInvoiceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceStatusDto
  ) {
    return this.billingService.updateInvoiceStatus(id, dto);
  }
}
