import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShoppingService } from '../application/shopping.service.js';
import {
  GenerateShoppingListDto,
  RenameShoppingListDto,
  SaveShoppingItemDto,
  ShoppingItemResponseDto,
  ShoppingListResponseDto,
} from './shopping.dto.js';

@ApiTags('shopping')
@Controller('shopping-lists')
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}

  @Get()
  @ApiOkResponse({ type: [ShoppingListResponseDto] })
  list() {
    return this.shopping.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: ShoppingListResponseDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.shopping.get(id);
  }

  @Post('generate')
  @ApiCreatedResponse({ type: ShoppingListResponseDto })
  generate(@Body() body: GenerateShoppingListDto) {
    return this.shopping.generate(body);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ShoppingListResponseDto })
  rename(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: RenameShoppingListDto,
  ) {
    return this.shopping.rename(id, body.name);
  }

  @Post(':id/items')
  @ApiCreatedResponse({ type: ShoppingItemResponseDto })
  addItem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: SaveShoppingItemDto,
  ) {
    return this.shopping.addItem(id, body);
  }

  @Put(':listId/items/:itemId')
  @ApiOkResponse({ type: ShoppingItemResponseDto })
  updateItem(
    @Param('listId', new ParseUUIDPipe({ version: '4' })) listId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Body() body: SaveShoppingItemDto,
  ) {
    return this.shopping.updateItem(listId, itemId, body);
  }

  @Delete(':listId/items/:itemId')
  @HttpCode(204)
  @ApiNoContentResponse()
  async removeItem(
    @Param('listId', new ParseUUIDPipe({ version: '4' })) listId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
  ) {
    await this.shopping.removeItem(listId, itemId);
  }
}
