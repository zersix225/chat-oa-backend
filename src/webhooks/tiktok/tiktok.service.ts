import { Injectable } from '@nestjs/common';

@Injectable()
export class TiktokService {
  handleWebhook(body: unknown) {
    console.log(body);
  }
}
