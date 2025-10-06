import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportService {
  

  findAll() {
    return `This action returns all report`;
  }

  findOne(id: number) {
    return `This action returns a #${id} report`;
  }

  

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
