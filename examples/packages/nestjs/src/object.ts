import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AuthZ } from './decorator';

@ObjectType()
export class User {
  @Field(() => ID)
  public id!: string;

  @Field()
  public username!: string;

  @Field()
  @AuthZ({ rules: ['IsAdmin'] })
  public email!: string;

  @Field(() => [Post])
  public posts!: Post[];
}

export enum Status {
  draft = 'draft',
  public = 'public'
}

registerEnumType(Status, { name: 'Status' });

@ObjectType()
@AuthZ({ rules: ['CanReadPost'] })
export class Post {
  @Field(() => ID)
  public id!: string;

  @Field()
  public title!: string;

  @Field()
  public body!: string;

  @Field(() => Status)
  public status!: Status;

  @Field(() => User)
  public author!: User;
}
