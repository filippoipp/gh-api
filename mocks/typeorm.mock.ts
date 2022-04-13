// eslint-disable-next-line import/no-extraneous-dependencies
import { mock, MockProxy } from 'jest-mock-extended';
import { Connection, Repository, SelectQueryBuilder } from 'typeorm';

export const repositoryMock = mock<Repository<any>>();
export const connectionMock: MockProxy<Connection> = mock<Connection>();
export const selectQueryBuilderMock = mock<SelectQueryBuilder<any>>();

jest.mock('typeorm', () => ({
  getCustomRepository: () => repositoryMock,
  getRepository: () => repositoryMock,
  getConnection: () => connectionMock,

  Entity: () => () => { },
  PrimaryColumn: () => () => { },
  PrimaryGeneratedColumn: () => () => { },
  Column: () => () => { },
  CreateDateColumn: () => () => { },
  UpdateDateColumn: () => () => { },
  Unique: () => () => { },
  JoinColumn: () => () => { },
  JoinTable: () => () => { },
  OneToOne: () => () => { },
  OneToMany: () => () => { },
  ManyToOne: () => () => { },
  Repository: jest.fn(),
  EntityRepository: () => () => { },
}));
