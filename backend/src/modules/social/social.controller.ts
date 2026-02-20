import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SocialService, CreatePostDto, CreateCommentDto, GetFeedQuery } from './social.service';
import { SocialPostType } from '../../entities/social.entity';

@ApiTags('social')
@Controller('social')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ===== Feed =====

  @Get('posts')
  @ApiOperation({ summary: 'Get social feed (hot / latest / following)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['hot', 'latest', 'following'] })
  @ApiQuery({ name: 'type', required: false, enum: SocialPostType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFeed(
    @Request() req: any,
    @Query('sort') sort?: 'hot' | 'latest' | 'following',
    @Query('type') type?: SocialPostType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.socialService.getFeed(req.user.id, { sort, type, page, limit });
  }

  // ===== Create Post =====

  @Post('posts')
  @ApiOperation({ summary: 'Create a social post' })
  async createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    return this.socialService.createPost(
      req.user.id,
      req.user.name || req.user.email || 'User',
      req.user.avatar,
      dto,
    );
  }

  // ===== Single Post =====

  @Get('posts/:postId')
  @Public()
  @ApiOperation({ summary: 'Get a post by ID (public)' })
  async getPost(@Param('postId') postId: string) {
    return this.socialService.getPostById(postId);
  }

  @Delete('posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own post' })
  async deletePost(@Request() req: any, @Param('postId') postId: string) {
    await this.socialService.deletePost(req.user.id, postId);
  }

  // ===== Comments =====

  @Get('posts/:postId/comments')
  @Public()
  @ApiOperation({ summary: 'List comments on a post' })
  async getComments(
    @Param('postId') postId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.socialService.getComments(postId, page, limit);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  async addComment(
    @Request() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.addComment(
      req.user.id,
      req.user.name || req.user.email || 'User',
      postId,
      dto,
    );
  }

  // ===== Likes =====

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Toggle like on a post' })
  async togglePostLike(@Request() req: any, @Param('postId') postId: string) {
    return this.socialService.toggleLike(req.user.id, postId, 'post');
  }

  @Post('comments/:commentId/like')
  @ApiOperation({ summary: 'Toggle like on a comment' })
  async toggleCommentLike(@Request() req: any, @Param('commentId') commentId: string) {
    return this.socialService.toggleLike(req.user.id, commentId, 'comment');
  }

  // ===== User Profiles =====

  @Get('users/:userId/posts')
  @Public()
  @ApiOperation({ summary: "Get a user's public posts" })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.socialService.getUserPosts(userId, page, limit);
  }

  @Get('users/:userId/followers')
  @Public()
  @ApiOperation({ summary: "Get user's followers" })
  async getFollowers(@Param('userId') userId: string) {
    return this.socialService.getFollowers(userId);
  }

  @Get('users/:userId/following')
  @Public()
  @ApiOperation({ summary: 'Get accounts a user is following' })
  async getFollowing(@Param('userId') userId: string) {
    return this.socialService.getFollowing(userId);
  }

  // ===== Follow =====

  @Post('users/:userId/follow')
  @ApiOperation({ summary: 'Toggle follow / unfollow a user' })
  async toggleFollow(@Request() req: any, @Param('userId') userId: string) {
    return this.socialService.toggleFollow(req.user.id, userId);
  }

  @Get('users/:userId/is-following')
  @ApiOperation({ summary: 'Check if current user follows someone' })
  async isFollowing(@Request() req: any, @Param('userId') userId: string) {
    const following = await this.socialService.isFollowing(req.user.id, userId);
    return { following };
  }
}
