import { AxiosError, AxiosResponse } from 'axios';
import { cpf, cnpj } from 'cpf-cnpj-validator';
import crypto from 'crypto';
import faker from 'faker';
import { mock } from 'jest-mock-extended';
import { sha512 } from 'js-sha512';
import jwt from 'jsonwebtoken';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import { RequiredActionAlias } from '@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { Secret, TOTP } from 'otpauth';
import supertest from 'supertest';
import { UpdateResult } from 'typeorm';
import { Client, NTPPacket } from 'ntp-time';

import { Logger } from '@al5bank/abl-logger';
import {
  mountRequestAuthMock,
  mountRequestMock,
} from '@mock/common-methods.mock';
import {
  GroupsMock,
  KeycloakAdminClientMock,
  UsersMock,
} from '@mock/keycloak-admin.mock';
import { KeycloakConfigMock } from '@mock/keycloak-config.mock';
import { repositoryMock, selectQueryBuilderMock } from '@mock/typeorm.mock';
import ICreateTokenRequest from '@domain/user/interfaces/users/create-token-request';
import Device from '@domain/user/entities/device';
import Role from '@domain/user/entities/role';
import User from '@domain/user/entities/user';
import ICheckUserExistQuery from '@domain/user/interfaces/users/check-user-exist-query';
import { ISendEmailUpdatePasswordRequest } from '@domain/user/interfaces/users/send-email-update-password-request';
import { ISendUserVerificationEmailRequest } from '@domain/user/interfaces/users/send-user-verification-email-request';
import { IUpdateUserRequest } from '@domain/user/interfaces/users/update-user-request';
import { IUserCreateRequest } from '@domain/user/interfaces/users/user-create-request';
import IUserResponse from '@domain/user/interfaces/users/user-response';
import DeviceModel from '@domain/user/model/device-model';
import RedisCacheService from '@domain/user/services/redis-cache-service';
import Config from '@config/app-config';
import App from './app';

const RedisCacheServiceMock = RedisCacheService as jest.MockedClass<typeof RedisCacheService>;
const ClientNTPMock = Client as jest.MockedClass<typeof Client>;

jest.mock('@al5bank/abl-logger', () => ({
  createServiceLogger: () => mock<Logger>(),
}));
jest.mock('@config/keycloak-config');
jest.mock('@domain/user/services/redis-cache-service');
jest.mock('ntp-time');

const app = new App().express;
let tokenValid: string;

const payload = {
  sub: 'a05d7cfd-c0fa-4f5a-b560-01cb0630e7dd',
  id_client: 8309,
  nickname: 'alan.primeiro',
  name: 'Beatriz Pizaia',
  preferred_username: '03554333000150alan.primeiro',
  accounts: 7263,
  given_name: 'Beatriz Pizaia',
  email: 'badar21996@goqoez.com',
  cnpj: cnpj.generate(),
  realm_access: {
    roles: ['offline_access', 'uma_authorization', 'master'],
  },
  resource_access: {
    'abs-user.api': {
      roles: [
        'get_user_by_query',
        'get_user_by_id',
        'get_user_by_group',
        'get_totp_secret',
        'post_user_device',
        'post_qr_code',
        'post_user',
        'put_user',
      ],
    },
  },
};

const payloadUnauthorized = {
  id_client: 8309,
  nickname: 'alan.primeiro',
  name: 'Beatriz Pizaia',
  preferred_username: '03554333000150alan.primeiro',
  accounts: 7263,
  given_name: 'Beatriz Pizaia',
  email: 'badar21996@goqoez.com',
  resource_access: {
    'abs-user.api': {
      roles: [],
    },
  },
};

const privateKey: string = process.env.KEYCLOAK_REALM_PRIVATE_KEY.replace(/(\w.{1,63})/g, '$1\n')
  .replace(/^/s, '-----BEGIN RSA PRIVATE KEY-----\n')
  .replace(/$/s, '-----END RSA PRIVATE KEY-----');

const fakeToken = () => crypto
  .randomBytes(16)
  .toString('hex')
  .replace(/^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/g, '$1-$2-$3-$4-$5');

const getToken = (payloadToken: any, secret: string) => jwt.sign(payloadToken, secret, {
  algorithm: 'RS256',
  expiresIn: 604800,
});

let timestamp: number;

const totpGenerate = (secret: string | Secret) => new TOTP({
  secret,
  digits: Config.TOTP.digits,
  period: Config.TOTP.period,
}).generate({ timestamp });

describe('Test app class', () => {
  test('Should response 404 when route not exists', async () => {
    const response = await supertest(app)
      .get(`/app/${faker.datatype.uuid()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({});
  });
});

describe('GET /api/private/v1/users', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakAdminClientMock.prototype.auth.mockRestore();
    KeycloakConfigMock.getAdmin.mockRestore();
    UsersMock.prototype.find.mockRestore();
  });

  test('Should response 401 when GET /api/private/v1/users not authenticated', async () => {
    const userToFindMock: ICheckUserExistQuery = {
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      email: faker.internet.email(),
      username: faker.internet.userName(),
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValueOnce([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get('/api/private/v1/users')
      .query(userToFindMock);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({});
  });

  test('Should response 403 when GET /api/private/v1/users with invalid token', async () => {
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const userToFindMock: ICheckUserExistQuery = {
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      email: faker.internet.email(),
      username: faker.internet.userName(),
    };

    const response = await supertest(app)
      .get('/api/private/v1/users')
      .query(userToFindMock)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 404 when GET /api/private/v1/users and user not found', async () => {
    const userRepresentationMock: UserRepresentation = {
      email: faker.internet.email(),
      attributes: {
        cnpj: cnpj.generate(),
        cpf: cpf.generate(),
        nickname: faker.internet.userName(),
      },
    };

    const userToFindMock: ICheckUserExistQuery = {
      cnpj: cnpj.generate(),
      cpf: userRepresentationMock.attributes.cpf,
      email: userRepresentationMock.email,
      username: userRepresentationMock.attributes.nickname,
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValueOnce([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get('/api/private/v1/users')
      .query(userToFindMock)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeTruthy();
    expect(response.body.code).toEqual('IDENTITY-006');
    expect(response.body.message).toEqual('Failed user not found.');
  });

  test('Should response 422 when GET /api/private/v1/users and not provide query params', async () => {
    const queryInvalidCNPJ = {
      cnpj: faker.datatype.uuid(),
      cpf: cpf.generate(),
      email: faker.internet.email(),
      username: faker.name.findName(),
    } as ICheckUserExistQuery;
    const queryInvalidCPF = {
      cnpj: cnpj.generate(),
      cpf: faker.datatype.uuid(),
      email: faker.internet.email(),
      username: faker.name.findName(),
    } as ICheckUserExistQuery;
    let response = await supertest(app)
      .get('/api/private/v1/users')
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .get('/api/private/v1/users')
      .query(queryInvalidCNPJ)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .get('/api/private/v1/users')
      .query(queryInvalidCPF)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when GET /api/private/v1/users with authenticated', async () => {
    const userRepresentationMock: UserRepresentation = {
      email: faker.internet.email(),
      attributes: {
        cnpj: cnpj.generate(),
        cpf: cpf.generate(),
        nickname: faker.internet.userName(),
      },
    };

    const userToFindMock: ICheckUserExistQuery = {
      cnpj: userRepresentationMock.attributes.cnpj,
      cpf: userRepresentationMock.attributes.cpf,
      email: userRepresentationMock.email,
      username: userRepresentationMock.attributes.nickname,
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValueOnce([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get('/api/private/v1/users')
      .query(userToFindMock)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/private/v1/users/:id', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakAdminClientMock.prototype.auth.mockRestore();
    KeycloakConfigMock.getAdmin.mockRestore();
    UsersMock.prototype.findOne.mockRestore();
    GroupsMock.prototype.find.mockRestore();
    GroupsMock.prototype.listMembers.mockRestore();
  });

  test('Should response 401 when GET /api/private/v1/users/:id without a token', async () => {
    const userId = faker.datatype.uuid();

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(null);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    const response = await supertest(app).get(`/api/private/v1/users/${userId}`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when GET /api/private/v1/users/:id with no authorized', async () => {
    const userId = faker.datatype.uuid();
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });
    UsersMock.prototype.findOne.mockResolvedValue(null);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 404 when GET /api/private/v1/users/:id and user not found', async () => {
    const userId = payload.sub;
    const group = {
      id: faker.datatype.uuid(),
    } as GroupRepresentation;
    const user = {
      id: userId,
    } as UserRepresentation;

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([user]);
    UsersMock.prototype.findOne.mockResolvedValue(null);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeTruthy();
    expect(response.body.code).toEqual('IDENTITY-006');
    expect(response.body.message).toEqual('Failed user not found.');
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when GET /api/private/v1/users/:id without a user id param', async () => {
    const response = await supertest(app)
      .get('/api/private/v1/users/')
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.code).toEqual('SERVER-422');
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when GET /api/private/v1/users/:id with authenticated', async () => {
    const userId = payload.sub;
    const group = {
      id: faker.datatype.uuid(),
    } as GroupRepresentation;
    const userRepresentationMock: UserRepresentation = {
      id: userId,
      email: faker.internet.email(),
      enabled: faker.datatype.boolean(),
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [faker.phone.phoneNumber('9999999999999')],
        cpf: [cpf.generate()],
        cnpj: [cnpj.generate()],
        role: [faker.datatype.uuid()],
        roleName: ['master'],
        nickname: [faker.internet.userName()],
      },
    };

    const userResponseMock: IUserResponse = {
      email: userRepresentationMock.email,
      id: userRepresentationMock.id,
      name: userRepresentationMock.firstName,
      enabled: userRepresentationMock.enabled,
      cellphone: userRepresentationMock.attributes.cellphone[0],
      cpf: userRepresentationMock.attributes.cpf[0],
      cnpj: userRepresentationMock.attributes.cnpj[0],
      role: userRepresentationMock.attributes.role[0],
      roleName: userRepresentationMock.attributes.roleName[0],
      username: userRepresentationMock.attributes.nickname[0],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userResponseMock]);
    UsersMock.prototype.findOne.mockResolvedValue(userRepresentationMock);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual(userResponseMock);
  });
});

describe('GET /api/private/v1/users/group/:cnpj/users', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    GroupsMock.prototype.find.mockRestore();
    GroupsMock.prototype.listMembers.mockRestore();
  });

  test('Should response 401 when GET /api/private/v1/users/group/:cnpj/users with not token', async () => {
    const cnpjMock = cnpj.generate();
    const response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjMock}/users`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when GET /api/private/v1/users/group/:cnpj/users with not authorized', async () => {
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });
    const cnpjMock = cnpj.generate();

    const response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjMock}/users`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 422 when GET /api/private/v1/users/group/:cnpj/users with request', async () => {
    const cnpjValidMock = cnpj.generate();
    const cnpjInvalidMock = faker.datatype.uuid();
    const tokenEmptyCnpj = jwt.sign({ ...payload, cnpj: '' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });
    const tokenInvalidCnpj = jwt.sign({ ...payload, cnpj: cnpjValidMock }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    let response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjValidMock}/users`)
      .set('Authorization', `Bearer ${tokenEmptyCnpj}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjInvalidMock}/users`)
      .set('Authorization', `Bearer ${tokenInvalidCnpj}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when GET /api/private/v1/users/group/:cnpj/users if group not exist', async () => {
    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    GroupsMock.prototype.find.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/group/${payload.cnpj}/users`)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual([]);
  });

  test('Should response 200 when GET /api/private/v1/users/group/:cnpj/users if users not found', async () => {
    const cnpjMock = cnpj.generate();
    const tokenWithCnpjForGroup = jwt.sign({ ...payload, cnpj: cnpjMock }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const group: GroupRepresentation = {
      name: cnpjMock,
      id: faker.datatype.uuid(),
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjMock}/users`)
      .set('Authorization', `Bearer ${tokenWithCnpjForGroup}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual([]);
  });

  test('Should response 200 when GET /api/private/v1/users/group/:cnpj/users if users found', async () => {
    const cnpjMock = cnpj.generate();
    const tokenWithCnpjForGroup = jwt.sign({ ...payload, cnpj: cnpjMock }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const group: GroupRepresentation = {
      name: cnpjMock,
      id: faker.datatype.uuid(),
    };

    const userRepresentationList: UserRepresentation[] = [
      {
        id: faker.datatype.uuid(),
        email: faker.internet.email(),
        enabled: faker.datatype.boolean(),
        username: faker.internet.userName(),
        firstName: faker.name.firstName(),
        attributes: {
          cellphone: [faker.phone.phoneNumber('9999999999999')],
          cpf: [cpf.generate()],
          cnpj: [cnpj.generate()],
          role: [faker.datatype.uuid()],
          nickname: [faker.internet.userName()],
          roleName: ['master'],
        },
      },
      {
        id: faker.datatype.uuid(),
        email: faker.internet.email(),
        enabled: faker.datatype.boolean(),
        username: faker.internet.userName(),
        firstName: faker.name.firstName(),
        attributes: {
          cellphone: [faker.phone.phoneNumber('9999999999999')],
          cpf: [cpf.generate()],
          cnpj: [cnpj.generate()],
          role: [faker.datatype.uuid()],
          nickname: [faker.internet.userName()],
          roleName: ['master'],
        },
      },
    ];

    const userResponseListMock: IUserResponse[] = userRepresentationList.map(
      (user) => ({
        id: user.id,
        email: user.email,
        name: user.firstName,
        enabled: user.enabled,
        role: user.attributes.role[0],
        roleName: user.attributes.roleName[0],
        cellphone: user.attributes.cellphone[0],
        cpf: user.attributes.cpf[0],
        cnpj: user.attributes.cnpj[0],
        username: user.attributes.nickname[0],
      } as IUserResponse),
    );

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue(userRepresentationList);
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .get(`/api/private/v1/users/group/${cnpjMock}/users`)
      .set('Authorization', `Bearer ${tokenWithCnpjForGroup}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual(userResponseListMock);
  });
});

describe('GET /api/private/v1/users/:id/device-key', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    RedisCacheServiceMock.prototype.getCache.mockRestore();
    RedisCacheServiceMock.prototype.setCache.mockRestore();
    repositoryMock.findOne.mockRestore();
  });

  test('Should response 401 when GET /api/private/v1/users/:id/device-key with not token', async () => {
    const userId = faker.datatype.uuid();
    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}/device-key`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when GET /api/private/v1/users/:id/device-key with not authorized', async () => {
    const userId = faker.datatype.uuid();
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}/device-key`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 422 when GET /api/private/v1/users/:id/device-key invalid id', async () => {
    const userId = faker.datatype.number();
    const tokenValidUserId = jwt.sign({ ...payload, sub: userId }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}/device-key`)
      .set('Authorization', `Bearer ${tokenValidUserId}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when GET /api/private/v1/users/:id/device-key', async () => {
    const userId = faker.datatype.uuid();
    const tokenValidUserId = jwt.sign({ ...payload, sub: userId }, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .get(`/api/private/v1/users/${userId}/device-key`)
      .set('Authorization', `Bearer ${tokenValidUserId}`);

    expect(response.status).toBe(200);
    expect(response.text).toBeTruthy();
    expect(response.text).toEqual(totpSecret);
  });
});

describe('POST /api/private/v1/users', () => {
  beforeEach(async () => {
    timestamp = new Date().getTime();
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    KeycloakAdminClientMock.prototype.auth.mockRestore();
    GroupsMock.prototype.create.mockRestore();
    GroupsMock.prototype.listMembers.mockRestore();
    GroupsMock.prototype.find.mockRestore();
    UsersMock.prototype.addRealmRoleMappings.mockRestore();
    UsersMock.prototype.addToGroup.mockRestore();
    UsersMock.prototype.create.mockRestore();
    UsersMock.prototype.find.mockRestore();
    repositoryMock.findOne.mockRestore();
    mountRequestAuthMock.mockRestore();
    RedisCacheServiceMock.prototype.getCache.mockRestore();
    RedisCacheServiceMock.prototype.setCache.mockRestore();
    ClientNTPMock.prototype.syncTime.mockResolvedValue({
      d: timestamp,
    } as NTPPacket);
  });

  test('Should response 401 when POST /api/private/v1/users without token', async () => {
    const password = 'An12mdasm23das';

    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };

    const response = await supertest(app).post('/api/private/v1/users').send(userCreateRequestMock);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when POST /api/private/v1/users without authorization', async () => {
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });
    const password = 'An12mdasm23das';
    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when POST /api/private/v1/users with invalid TOTP', async () => {
    const password = 'An12mdasm23das';
    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(faker.datatype.uuid())).base32;
    const totpValid = totpGenerate(totpSecret);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 409 when POST /api/private/v1/users if email already exists', async () => {
    const email = faker.internet.email();
    const password = 'An12mdasm23das';
    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email,
      enabled: faker.datatype.boolean(),
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: faker.phone.phoneNumber('9999999999999'),
        cpf: cpf.generate(),
        role: faker.datatype.uuid(),
        nickname: faker.internet.userName(),
        roleName: 'master',
      },
    };
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find
      .mockResolvedValueOnce([userRepresentationMock])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(409);
    expect(response.body.code).toEqual('IDENTITY-001');
    expect(response.body.message).toEqual('Failed to create user, user already exists.');
  });

  test('Should response 409 when POST /api/private/v1/users if user exists in other group', async () => {
    const email = faker.internet.email();
    const cpfMock = cpf.generate();
    const password = 'An12mdasm23das';
    const role: Role = {
      id: faker.datatype.uuid(),
      name: 'master',
      description: 'master pro front',
      externalId: faker.datatype.uuid(),
      externalName: 'master',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpfMock,
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email,
      enabled: faker.datatype.boolean(),
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [faker.phone.phoneNumber('9999999999999')],
        cpf: [cpfMock],
        role: [faker.datatype.uuid()],
        nickname: [faker.internet.userName()],
        roleName: ['master'],
      },
    };

    const groups: GroupRepresentation = { id: faker.datatype.uuid() };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();

    UsersMock.prototype.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    GroupsMock.prototype.find.mockResolvedValue([groups]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userRepresentationMock]);

    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(role);

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(409);
    expect(response.body.code).toEqual('IDENTITY-008');
    expect(response.body.message).toEqual('Failed user exists in a group.');
  });

  test('Should response 409 when POST /api/private/v1/users if role not found', async () => {
    const email = faker.internet.email();
    const cpfMock = cpf.generate();
    const password = 'An12mdasm23das';

    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpfMock,
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: 'master',
    };

    const groups: GroupRepresentation = { id: faker.datatype.uuid() };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();

    UsersMock.prototype.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    GroupsMock.prototype.find.mockResolvedValue([groups]);
    GroupsMock.prototype.listMembers.mockResolvedValue([]);

    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(null);

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(409);
    expect(response.body.code).toEqual('IDENTITY-010');
    expect(response.body.message).toEqual('Role not found.');
  });

  test('Should response 422 when POST /api/private/v1/users', async () => {
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const userCreateRequestBaseMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      password: 'An12mdasm23das',
      username: faker.internet.userName(),
      identityClientId: faker.name.firstName(),
      role: faker.datatype.uuid(),
    };
    const userCreateRequestInvalidPasswordMock: IUserCreateRequest = {
      ...userCreateRequestBaseMock,
      password: '12345678',
    };
    const userCreateRequestInvalidCPFMock: IUserCreateRequest = {
      ...userCreateRequestBaseMock,
      cpf: faker.datatype.uuid(),
    };
    const userCreateRequestInvalidCNPJMock: IUserCreateRequest = {
      ...userCreateRequestBaseMock,
      cnpj: faker.datatype.uuid(),
    };
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    let response = await supertest(app)
      .post('/api/private/v1/users')
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestInvalidPasswordMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestInvalidCPFMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestInvalidCNPJMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 201 when POST /api/private/v1/users without password', async () => {
    const email = faker.internet.email();
    const cpfMock = cpf.generate();
    const role: Role = {
      id: faker.datatype.uuid(),
      name: 'master',
      description: 'master pro front',
      externalId: faker.datatype.uuid(),
      externalName: 'master',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpfMock,
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      identityClientId: faker.name.firstName(),
      role: role.id,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email,
      enabled: true,
      username: userCreateRequestMock.username,
      firstName: userCreateRequestMock.name,
      attributes: {
        cellphone: userCreateRequestMock.cellphone,
        cnpj: userCreateRequestMock.cnpj,
        cpf: cpfMock,
        nickname: userCreateRequestMock.username,
        role: role.id,
        roleName: role.name,
      },
    };

    const userResponseMock: IUserResponse = {
      cellphone: userRepresentationMock.attributes.cellphone,
      cpf: userRepresentationMock.attributes.cpf,
      email: userRepresentationMock.email,
      id: userRepresentationMock.id,
      name: userRepresentationMock.firstName,
      role: userRepresentationMock.attributes.role,
      roleName: userRepresentationMock.attributes.roleName,
      enabled: userRepresentationMock.enabled,
      username: userRepresentationMock.attributes.nickname,
      cnpj: userRepresentationMock.attributes.cnpj,
    };

    const group: GroupRepresentation = { id: faker.datatype.uuid() };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();

    UsersMock.prototype.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    GroupsMock.prototype.find.mockResolvedValue([]);

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(role);

    GroupsMock.prototype.create.mockResolvedValue({ id: group.id });
    UsersMock.prototype.create.mockResolvedValue({
      id: userRepresentationMock.id,
    });

    UsersMock.prototype.addToGroup.mockResolvedValue('');

    UsersMock.prototype.addRealmRoleMappings.mockResolvedValue();

    mountRequestAuthMock.mockResolvedValue({
      status: 200,
    } as AxiosResponse);

    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual(userResponseMock);
  });

  test('Should response 201 when POST /api/private/v1/users with password', async () => {
    const email = faker.internet.email();
    const cpfMock = cpf.generate();
    const password = 'An12mdasm23das';
    const role: Role = {
      id: faker.datatype.uuid(),
      name: 'master',
      description: 'master pro front',
      externalId: faker.datatype.uuid(),
      externalName: 'master',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userCreateRequestMock: IUserCreateRequest = {
      idClient: faker.datatype.number(),
      idAccount: faker.datatype.number(),
      cnpj: cnpj.generate(),
      cpf: cpfMock,
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      username: faker.internet.userName(),
      password,
      identityClientId: faker.name.firstName(),
      role: role.id,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email,
      enabled: true,
      username: userCreateRequestMock.username,
      firstName: userCreateRequestMock.name,
      attributes: {
        cellphone: userCreateRequestMock.cellphone,
        cnpj: userCreateRequestMock.cnpj,
        cpf: cpfMock,
        nickname: userCreateRequestMock.username,
        role: role.id,
        roleName: role.name,
      },
    };

    const userResponseMock: IUserResponse = {
      cellphone: userRepresentationMock.attributes.cellphone,
      cpf: userRepresentationMock.attributes.cpf,
      email: userRepresentationMock.email,
      id: userRepresentationMock.id,
      name: userRepresentationMock.firstName,
      role: userRepresentationMock.attributes.role,
      roleName: userRepresentationMock.attributes.roleName,
      enabled: userRepresentationMock.enabled,
      username: userRepresentationMock.attributes.nickname,
      cnpj: userRepresentationMock.attributes.cnpj,
    };

    const group: GroupRepresentation = { id: faker.datatype.uuid() };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();

    UsersMock.prototype.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    GroupsMock.prototype.find.mockResolvedValue([]);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(role);

    GroupsMock.prototype.create.mockResolvedValue({ id: group.id });
    UsersMock.prototype.create.mockResolvedValue({
      id: userRepresentationMock.id,
    });

    UsersMock.prototype.addToGroup.mockResolvedValue('');
    UsersMock.prototype.addRealmRoleMappings.mockResolvedValue();
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/private/v1/users')
      .send(userCreateRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual(userResponseMock);
  });
});

describe('POST /api/public/v1/users/token', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    mountRequestMock.mockRestore();
    UsersMock.prototype.find.mockRestore();
    KeycloakAdminClientMock.prototype.auth.mockRestore();
  });

  test('Should response 401 when POST /api/public/v1/users/token without params', async () => {
    const password = 'An12mdasm23das';
    const userMock = {
      cnpj: cnpj.generate(),
      username: faker.internet.userName(),
      password,
      identityClientId: 'afs-internet-banking.web',
    };

    KeycloakAdminClientMock.prototype.auth.mockImplementation(() => {
      throw {
        response: {
          status: 401,
        },
      } as AxiosError;
    });
    UsersMock.prototype.find.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app).post('/api/public/v1/users/token').send(userMock);
    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/token without params', async () => {
    const password = 'An12mdasm23das';
    const userInvalidCNPJ = {
      cnpj: faker.datatype.uuid(),
      username: faker.datatype.uuid(),
      password,
      identityClientId: 'afs-internet-banking.web',
    } as ICreateTokenRequest;
    const userInvalidCPF = {
      username: faker.datatype.uuid(),
      password,
      identityClientId: 'afs-internet-banking.web',
    } as ICreateTokenRequest;

    let response = await supertest(app)
      .post('/api/public/v1/users/token');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userInvalidCNPJ);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();

    response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userInvalidCPF);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 428 when POST /api/public/v1/users/token if has actions to do', async () => {
    const password = 'An12mdasm23das';

    const userMock = {
      cnpj: cnpj.generate(),
      username: faker.internet.userName(),
      password,
      identityClientId: 'afs-internet-banking.web',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      requiredActions: [RequiredActionAlias.VERIFY_EMAIL],
    };

    const axiosError = {
      response: {
        status: 400,
      },
    } as AxiosError;

    KeycloakAdminClientMock.prototype.auth
      .mockResolvedValueOnce()
      .mockRejectedValue(axiosError);
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userMock);

    expect(response.status).toBe(428);
    expect(response.body.code).toEqual('IDENTITY-007');
    expect(response.body.message).toEqual('Failed user required actions.');
  });

  test('Should response 200 when POST /api/public/v1/users/token with authenticated and CNPJ', async () => {
    const accessTokenMock = faker.datatype.uuid();
    const refreshTokenMock = faker.datatype.uuid();
    const password = 'An12mdasm23das';
    const userMock = {
      cnpj: cnpj.generate(),
      username: faker.internet.userName(),
      password,
      identityClientId: 'afs-internet-banking.web',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.accessToken = accessTokenMock;
    KeycloakAdminClientMock.prototype.refreshToken = refreshTokenMock;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userMock);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({
      accessToken: accessTokenMock,
      refreshToken: refreshTokenMock,
    });
  });

  test('Should response 200 when POST /api/public/v1/users/token with authenticated and CPF', async () => {
    const accessTokenMock = faker.datatype.uuid();
    const refreshTokenMock = faker.datatype.uuid();
    const password = 'An12mdasm23das';
    const userMock = {
      username: cpf.generate(),
      password,
      identityClientId: 'afs-internet-banking.web',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.accessToken = accessTokenMock;
    KeycloakAdminClientMock.prototype.refreshToken = refreshTokenMock;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userMock);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({
      accessToken: accessTokenMock,
      refreshToken: refreshTokenMock,
    });
  });

  test('Should response 200 when POST /api/public/v1/users/token with authenticated and refreshToken', async () => {
    const accessTokenMock = faker.datatype.uuid();
    const refreshTokenMock = faker.datatype.uuid();
    const userMock = {
      refreshToken: faker.datatype.uuid(),
      identityClientId: 'afs-internet-banking.web',
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.accessToken = accessTokenMock;
    KeycloakAdminClientMock.prototype.refreshToken = refreshTokenMock;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    mountRequestMock.mockResolvedValue({
      status: 200,
      data: {
        access_token: accessTokenMock,
        refresh_token: refreshTokenMock,
      },
    } as AxiosResponse);

    const response = await supertest(app)
      .post('/api/public/v1/users/token')
      .send(userMock);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({
      accessToken: accessTokenMock,
      refreshToken: refreshTokenMock,
    });
  });
});

describe('POST /api/public/v1/users/recovery-username', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    mountRequestAuthMock.mockRestore();
    KeycloakConfigMock.getAdmin.mockRestore();
    UsersMock.prototype.find.mockRestore();
  });

  test('Should response 404 when POST /api/public/v1/users/recovery-username user not found', async () => {
    const sendRecoverUsernameEmailMock: ISendUserVerificationEmailRequest = {
      identityClientId: 'afs-internet-banking.web',
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/recovery-username')
      .send(sendRecoverUsernameEmailMock);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('IDENTITY-006');
    expect(response.body.message).toBe('Failed user not found.');
  });

  test('Should response 422 when POST /api/public/v1/users/recovery-username without body', async () => {
    const response = await supertest(app).post('/api/public/v1/users/recovery-username');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/recovery-username with invalid cpf', async () => {
    const sendRecoverUsernameEmailMock: ISendUserVerificationEmailRequest = {
      identityClientId: 'afs-internet-banking.web',
      cnpj: cnpj.generate(),
      cpf: faker.name.findName(),
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/recovery-username')
      .send(sendRecoverUsernameEmailMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/recovery-username with invalid cnpj', async () => {
    const sendRecoverUsernameEmailMock: ISendUserVerificationEmailRequest = {
      identityClientId: 'afs-internet-banking.web',
      cnpj: faker.name.findName(),
      cpf: cpf.generate(),
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/recovery-username')
      .send(sendRecoverUsernameEmailMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 500 when POST /api/public/v1/users/recovery-username throw exception', async () => {
    const cpfMock = cpf.generate();
    const cnpjMock = cnpj.generate();
    const sendRecoverUsernameEmailMock: ISendUserVerificationEmailRequest = {
      identityClientId: 'afs-internet-banking.web',
      cnpj: cnpjMock,
      cpf: cpfMock,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: `${cnpjMock}${faker.internet.userName()}`,
      firstName: faker.name.firstName(),
      attributes: {
        cpf: [cpfMock],
      },
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    mountRequestAuthMock.mockRejectedValue({
      response: {
        status: 400,
      },
    } as AxiosError);

    const response = await supertest(app)
      .post('/api/public/v1/users/recovery-username')
      .send(sendRecoverUsernameEmailMock);

    expect(response.status).toBe(500);
  });

  test('Should response 200 when POST /api/public/v1/users/recovery-username with authenticated', async () => {
    const cpfMock = cpf.generate();
    const cnpjMock = cnpj.generate();
    const sendRecoverUsernameEmailMock: ISendUserVerificationEmailRequest = {
      identityClientId: 'afs-internet-banking.web',
      cnpj: cnpjMock,
      cpf: cpfMock,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: `${cnpjMock}${faker.internet.userName()}`,
      firstName: faker.name.firstName(),
      attributes: {
        cpf: [cpfMock],
      },
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    mountRequestAuthMock.mockResolvedValue({
      status: 200,
    } as AxiosResponse);

    const response = await supertest(app)
      .post('/api/public/v1/users/recovery-username')
      .send(sendRecoverUsernameEmailMock);

    expect(response.status).toBe(200);
  });
});

describe('POST /api/public/v1/users/change-password-link', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    UsersMock.prototype.find.mockRestore();
    UsersMock.prototype.executeActionsEmail.mockRestore();
  });

  test('Should response 404 when POST /api/public/v1/users/change-password-link with user not found', async () => {
    const passwordResetMock: ISendEmailUpdatePasswordRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/change-password-link')
      .send(passwordResetMock);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('IDENTITY-006');
    expect(response.body.message).toBe('Failed user not found.');
  });

  test('Should response 422 when POST /api/public/v1/users/change-password-link with without body', async () => {
    const response = await supertest(app).post('/api/public/v1/users/change-password-link');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/change-password-link with with invalid cpf', async () => {
    const passwordResetMock: ISendEmailUpdatePasswordRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpj.generate(),
      cpf: '',
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/change-password-link')
      .send(passwordResetMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/change-password-link with with invalid cnpj', async () => {
    const passwordResetMock: ISendEmailUpdatePasswordRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: faker.name.findName(),
      cpf: cpf.generate(),
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/change-password-link')
      .send(passwordResetMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 500 when POST /api/public/v1/users/change-password-link throw exception', async () => {
    const cpfMock = cpf.generate();
    const cnpjMock = cnpj.generate();
    const passwordResetMock: ISendEmailUpdatePasswordRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpjMock,
      cpf: cpfMock,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: `${cnpjMock}${faker.internet.userName()}`,
      firstName: faker.name.firstName(),
      attributes: {
        cpf: [cpfMock],
      },
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    UsersMock.prototype.executeActionsEmail.mockImplementation(() => {
      throw new Error('');
    });
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/change-password-link')
      .send(passwordResetMock);

    expect(response.status).toBe(500);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when POST /api/public/v1/users/change-password-link', async () => {
    const cpfMock = cpf.generate();
    const cnpjMock = cnpj.generate();
    const passwordResetMock: ISendEmailUpdatePasswordRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpjMock,
      cpf: cpfMock,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: `${cnpjMock}${faker.internet.userName()}`,
      firstName: faker.name.firstName(),
      attributes: {
        cpf: [cpfMock],
      },
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    UsersMock.prototype.executeActionsEmail.mockResolvedValue();
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/change-password-link')
      .send(passwordResetMock);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });
});

describe('POST /api/public/v1/users/verification-link', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    UsersMock.prototype.find.mockRestore();
    UsersMock.prototype.executeActionsEmail.mockRestore();
  });

  test('Should response 404 when POST /api/public/v1/users/verification-link with user not found', async () => {
    const sendVerificationMock: ISendUserVerificationEmailRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpj.generate(),
      cpf: cpf.generate(),
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/verification-link')
      .send(sendVerificationMock);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('IDENTITY-006');
    expect(response.body.message).toBe('Failed user not found.');
  });

  test('Should response 422 when POST /api/public/v1/users/verification-link with without body', async () => {
    const response = await supertest(app).post('/api/public/v1/users/verification-link');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/verification-link with with invalid cpf', async () => {
    const sendVerificationMock: ISendUserVerificationEmailRequest = {
      identityClientId: faker.datatype.uuid(),
      cpf: '',
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/verification-link')
      .send(sendVerificationMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /api/public/v1/users/verification-link with with invalid cnpj', async () => {
    const sendVerificationMock: ISendUserVerificationEmailRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: faker.name.findName(),
      cpf: cpf.generate(),
    };

    const response = await supertest(app)
      .post('/api/public/v1/users/verification-link')
      .send(sendVerificationMock);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 200 when POST /api/public/v1/users/verification-link', async () => {
    const cpfMock = cpf.generate();
    const cnpjMock = cnpj.generate();
    const sendVerificationMock: ISendUserVerificationEmailRequest = {
      identityClientId: faker.datatype.uuid(),
      cnpj: cnpjMock,
      cpf: cpfMock,
    };

    const userRepresentationMock: UserRepresentation = {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      enabled: true,
      username: `${cnpjMock}${faker.internet.userName()}`,
      firstName: faker.name.firstName(),
      attributes: {
        cpf: [cpfMock],
      },
      requiredActions: [],
    };

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.find.mockResolvedValue([userRepresentationMock]);
    UsersMock.prototype.executeActionsEmail.mockResolvedValue();
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);

    const response = await supertest(app)
      .post('/api/public/v1/users/verification-link')
      .send(sendVerificationMock);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });
});

describe('POST /api/private/v1/users/:id/qr-code', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    repositoryMock.findOne.mockRestore();
    UsersMock.prototype.find.mockRestore();
  });

  test('Should response 401 when POST /api/private/v1/users/:id/qr-code without a token', async () => {
    const userId = faker.datatype.uuid();
    const response = await supertest(app).post(`/api/private/v1/users/${userId}/qr-code`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when POST /api/private/v1/users/:id/qr-code with no authorized', async () => {
    const userId = faker.datatype.uuid();
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/qr-code`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 404 when POST /api/private/v1/users/:id/qr-code if user not found', async () => {
    const userId = payload.sub;

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/qr-code`)
      .set('Authorization', `Bearer ${tokenValid}`);

    repositoryMock.findOne.mockResolvedValue(null);

    expect(response.status).toBe(404);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 201 when POST /api/private/v1/users/:id/qr-code with authenticated', async () => {
    const userId = payload.sub;
    const userMock = {
      id: faker.datatype.uuid(),
      saltKey: faker.datatype.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.past(),
    };

    repositoryMock.findOne.mockResolvedValue(userMock);

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/qr-code`)
      .send(userMock)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
  });
});

describe('POST /api/private/v1/users/:id/device', () => {
  beforeEach(async () => {
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    repositoryMock.findOne.mockRestore();
    repositoryMock.save.mockRestore();
    repositoryMock.update.mockRestore();
    UsersMock.prototype.find.mockRestore();
  });

  test('Should response 401 when POST /api/private/v1/users/:id/device without a token', async () => {
    const userId = faker.datatype.uuid();
    const response = await supertest(app).post(`/api/private/v1/users/${userId}/device`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when POST /api/private/v1/users/:id/device with no authorized', async () => {
    const userId = faker.datatype.uuid();
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/device`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when POST /api/private/v1/users/:id/device invalid TOTP', async () => {
    const userId = payload.sub;
    const description = faker.name.jobDescriptor();
    const deviceKey = faker.random.alphaNumeric(8);
    const saltKey = faker.random.alphaNumeric(8);

    const userMock = {
      id: userId,
      device: [],
      saltKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const otpKey = new TOTP({
      secret: Secret.fromHex(sha512(`${faker.random.alphaNumeric(8)}${deviceKey}`)).base32,
      digits: Config.TOTP.digits,
      period: Config.TOTP.period,
    }).generate();

    repositoryMock.findOne.mockResolvedValue(userMock);

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/device`)
      .send({
        description,
        deviceKey,
        otpKey,
      })
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toEqual('DEVICE-000');
    expect(response.body.message).toEqual('Invalid Token.');
  });

  test('Should response 404 when POST /api/private/v1/users/:id/device if user not found', async () => {
    const userId = payload.sub;
    const description = faker.name.jobDescriptor();
    const deviceKey = faker.random.alphaNumeric(8);

    const otpKey = new TOTP({
      secret: Secret.fromHex(sha512(`${faker.random.alphaNumeric(8)}${deviceKey}`)).base32,
      digits: Config.TOTP.digits,
      period: Config.TOTP.period,
    }).generate({ timestamp });

    repositoryMock.findOne.mockResolvedValue(null);

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/device`)
      .send({
        description,
        deviceKey,
        otpKey,
      })
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toEqual('USER-000');
    expect(response.body.message).toEqual('User not found.');
  });

  test('Should response 422 when POST /api/private/v1/users/:id/device with with no body', async () => {
    const userId = payload.sub;
    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/device`)
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 201 when POST /api/private/v1/users/:id/device with authenticated', async () => {
    const userId = payload.sub;
    const description = faker.name.jobDescriptor();
    const deviceKey = faker.random.alphaNumeric(8);
    const saltKey = faker.random.alphaNumeric(8);

    const userMock: User = {
      externalId: userId,
      device: [],
      saltKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const otpKey = new TOTP({
      secret: Secret.fromHex(sha512(`${userMock.saltKey}${deviceKey}`)).base32,
      digits: Config.TOTP.digits,
      period: Config.TOTP.period,
    }).generate({ timestamp });

    const mockResponse: DeviceModel = {
      active: true,
      description,
    };

    const createdDeviceMock: Device = {
      active: true,
      createdAt: new Date(),
      description,
      deviceKey,
      id: faker.datatype.uuid(),
      updatedAt: new Date(),
      userId,
      saltKey: userMock.saltKey,
      user: {
        ...userMock,
      },
    };

    repositoryMock.findOne.mockResolvedValue(userMock);
    repositoryMock.update.mockResolvedValue({} as UpdateResult);
    repositoryMock.save.mockResolvedValue(createdDeviceMock);

    const response = await supertest(app)
      .post(`/api/private/v1/users/${userId}/device`)
      .send({
        description,
        deviceKey,
        otpKey,
      })
      .set('Authorization', `Bearer ${tokenValid}`);

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual(mockResponse);
  });
});

describe('PUT /api/private/v1/users/:id', () => {
  beforeEach(async () => {
    timestamp = new Date().getTime();
    tokenValid = getToken(payload, privateKey);
    KeycloakConfigMock.getAdmin.mockRestore();
    repositoryMock.find.mockRestore();
    repositoryMock.findOne.mockRestore();
    repositoryMock.save.mockRestore();
    repositoryMock.update.mockRestore();
    UsersMock.prototype.find.mockRestore();
    UsersMock.prototype.findOne.mockRestore();
    UsersMock.prototype.addRealmRoleMappings.mockRestore();
    UsersMock.prototype.delRealmRoleMappings.mockRestore();
    UsersMock.prototype.sendVerifyEmail.mockRestore();
    GroupsMock.prototype.find.mockRestore();
    GroupsMock.prototype.listMembers.mockRestore();
    RedisCacheServiceMock.prototype.getCache.mockRestore();
    RedisCacheServiceMock.prototype.setCache.mockRestore();
  });

  test('Should response 401 when PUT /api/private/v1/users/:id without a token', async () => {
    const userId = faker.datatype.uuid();
    const response = await supertest(app).put(`/api/private/v1/users/${userId}`);

    expect(response.status).toBe(401);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when PUT /api/private/v1/users/:id with no authorized', async () => {
    const userId = faker.datatype.uuid();
    const tokenInvalid = jwt.sign(payloadUnauthorized, privateKey, {
      algorithm: 'RS256',
      expiresIn: 604800,
    });

    const response = await supertest(app)
      .put(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenInvalid}`);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 403 when PUT /api/private/v1/users/:id with invalid TOTP', async () => {
    const userId = faker.datatype.uuid();
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(faker.datatype.uuid())).base32;
    const totpValid = totpGenerate(totpSecret);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 422 when PUT /api/private/v1/users/:id with no body ', async () => {
    const userId = payload.sub;
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${userId}`)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 404 when PUT /api/private/v1/users/:id if user not found', async () => {
    const userMock = {
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: true,
      role: faker.datatype.uuid(),
    } as IUpdateUserRequest;
    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(null);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${fakeToken()}`)
      .send(userMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(404);
    expect(response.body.code).toEqual('IDENTITY-006');
    expect(response.body.message).toEqual('Failed user not found.');
  });

  test('Should response 400 when PUT /api/private/v1/users/:id if user change own status', async () => {
    const email = faker.internet.email();

    const updateUserRequestMock: IUpdateUserRequest = {
      name: faker.name.firstName(),
      email: faker.internet.email(),
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: false,
      role: faker.datatype.uuid(),
    };

    const userRepresentationMock: UserRepresentation = {
      id: payload.sub,
      email,
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [crypto.randomInt(99999999999).toString()],
        cpf: [cpf.generate()],
        cnpj: [cnpj.generate()],
        nickname: [faker.internet.userName()],
        role: [updateUserRequestMock.role],
        roleName: ['master'],
      },
    };

    const group: GroupRepresentation = {
      id: faker.datatype.uuid(),
    };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(userRepresentationMock);
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${fakeToken()}`)
      .send(updateUserRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(400);
    expect(response.body.code).toEqual('IDENTITY-009');
    expect(response.body.message).toEqual('Failed to update user.');
  });

  test('Should response 409 when PUT /api/private/v1/users/:id if already exist email', async () => {
    const email = faker.internet.email();

    const updateUserRequestMock: IUpdateUserRequest = {
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: true,
      role: faker.datatype.uuid(),
    };

    const userRepresentationMock: UserRepresentation = {
      id: payload.sub,
      email: faker.internet.email(),
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [crypto.randomInt(99999999999).toString()],
        cpf: [cpf.generate()],
        cnpj: [cnpj.generate()],
        nickname: [faker.internet.userName()],
        role: [updateUserRequestMock.role],
        roleName: ['master'],
      },
    };

    const currentUserRepresentationMock: UserRepresentation = {
      ...userRepresentationMock,
    };

    const group: GroupRepresentation = {
      id: faker.datatype.uuid(),
    };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(userRepresentationMock);
    UsersMock.prototype.find.mockResolvedValueOnce([currentUserRepresentationMock]);
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${fakeToken()}`)
      .send(updateUserRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(409);
    expect(response.body.code).toEqual('IDENTITY-011');
    expect(response.body.message).toEqual('Email already exists.');
  });

  test('Should response 400 when PUT /api/private/v1/users/:id if role not found', async () => {
    const email = faker.internet.email();

    const updateUserRequestMock: IUpdateUserRequest = {
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: true,
      role: faker.datatype.uuid(),
    };

    const userRepresentationMock: UserRepresentation = {
      id: payload.sub,
      email,
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [crypto.randomInt(99999999999).toString()],
        cpf: [cpf.generate()],
        cnpj: [cnpj.generate()],
        nickname: [faker.internet.userName()],
        role: [faker.datatype.uuid()],
        roleName: ['master'],
      },
    };

    const group: GroupRepresentation = {
      id: faker.datatype.uuid(),
    };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(userRepresentationMock);
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    selectQueryBuilderMock.getMany.mockResolvedValue([]);
    selectQueryBuilderMock.where.mockReturnThis();
    repositoryMock.createQueryBuilder.mockReturnValue(selectQueryBuilderMock);
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${fakeToken()}`)
      .send(updateUserRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(400);
    expect(response.body.code).toEqual('IDENTITY-010');
    expect(response.body.message).toEqual('Role not found.');
  });

  test('Should response 500 when PUT /api/private/v1/users/:id throw a exception ', async () => {
    const email = faker.internet.email();

    const updateUserRequestMock: IUpdateUserRequest = {
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: true,
      role: faker.datatype.uuid(),
    };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakAdminClientMock.prototype.auth.mockRejectedValue(new Error('Any Error.'));
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${fakeToken()}`)
      .send(updateUserRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(500);
    expect(response.body.code).toEqual('IDENTITY-003');
    expect(response.body.message).toEqual('Default error.');
  });

  test('Should response 200 when PUT /api/private/v1/users/:id authorized', async () => {
    const email = faker.internet.email();
    const roles: Role[] = [
      {
        createdAt: new Date(),
        description: 'some description',
        externalId: faker.datatype.uuid(),
        externalName: 'some name',
        id: faker.datatype.uuid(),
        name: 'laucher',
        updatedAt: new Date(),
      },
      {
        createdAt: new Date(),
        description: 'some description',
        externalId: faker.datatype.uuid(),
        externalName: 'some name',
        id: faker.datatype.uuid(),
        name: 'authorizer',
        updatedAt: new Date(),
      },
    ];

    const updateUserRequestMock: IUpdateUserRequest = {
      name: faker.name.firstName(),
      email,
      cellphone: faker.phone.phoneNumber('99999999999'),
      identityClientId: faker.name.firstName(),
      enabled: true,
      role: roles[0].id,
    };

    const userRepresentationMock: UserRepresentation = {
      id: payload.sub,
      email,
      enabled: true,
      username: faker.internet.userName(),
      firstName: faker.name.firstName(),
      attributes: {
        cellphone: [crypto.randomInt(99999999999).toString()],
        cpf: [cpf.generate()],
        cnpj: [cnpj.generate()],
        nickname: [faker.internet.userName()],
        role: [roles[0].id],
        roleName: [roles[0].name],
      },
    };

    const group: GroupRepresentation = {
      id: faker.datatype.uuid(),
    };

    const device = {
      saltKey: faker.datatype.uuid(),
      deviceKey: faker.datatype.uuid(),
    } as Device;
    const totpSecret = Secret.fromHex(sha512(`${device.saltKey}${device.deviceKey}`)).base32;
    const totpValid = totpGenerate(totpSecret);

    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    UsersMock.prototype.findOne.mockResolvedValue(userRepresentationMock);
    GroupsMock.prototype.find.mockResolvedValue([group]);
    GroupsMock.prototype.listMembers.mockResolvedValue([userRepresentationMock]);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    KeycloakAdminClientMock.prototype.groups = GroupsMock.prototype;
    selectQueryBuilderMock.getMany.mockResolvedValue(roles);
    selectQueryBuilderMock.where.mockReturnThis();
    repositoryMock.createQueryBuilder.mockReturnValue(selectQueryBuilderMock);
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(null);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(null);
    repositoryMock.findOne.mockResolvedValue(device);

    const response = await supertest(app)
      .put(`/api/private/v1/users/${faker.datatype.uuid()}`)
      .send(updateUserRequestMock)
      .set('Authorization', `Bearer ${tokenValid}`)
      .set('totp-token', totpValid);

    expect(response.status).toBe(200);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });

  test('Should response 422 when POST /public/v1/users/validation-code and not provide body', async () => {
    const response = await supertest(app)
      .post('/api/public/v1/users/validation-code');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when POST /public/v1/users/validation-code and provide invalid username', async () => {
    const username = faker.datatype.number();
    const response = await supertest(app)
      .post('/api/public/v1/users/validation-code')
      .send({ username });

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 201 when POST /public/v1/users/validation-code with correct body', async () => {
    const username = cpf.generate();
    const type = 'EMAIL';
    const user = {
      id: faker.datatype.uuid(),
      attributes: { cpf: [username] },
    } as UserRepresentation;
    const validationCode = Number(Math.random().toString().substr(2, 5));

    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    UsersMock.prototype.find.mockResolvedValue([user]);
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    RedisCacheServiceMock.prototype.setCache.mockResolvedValue(validationCode);

    const response = await supertest(app)
      .post('/api/public/v1/users/validation-code')
      .send({ username, type });

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
  });

  test('Should response 422 when PATCH /public/v1/users/password and not provide body', async () => {
    const response = await supertest(app)
      .patch('/api/public/v1/users/password');

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 422 when PATCH /public/v1/users/password and provide invalid username', async () => {
    const username = faker.datatype.number();
    const response = await supertest(app)
      .patch('/api/public/v1/users/password')
      .send({ username });

    expect(response.status).toBe(422);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 403 when PATCH /public/v1/users/password and provide invalid totp token', async () => {
    const fakeUpdatePasswordBody = {
      username: cpf.generate(),
      password: faker.internet.password(),
    };
    const totpSecret = Secret.fromHex(sha512(faker.datatype.uuid())).base32;
    const totpInvalid = totpGenerate(totpSecret);

    const response = await supertest(app)
      .patch('/api/public/v1/users/password')
      .send(fakeUpdatePasswordBody)
      .set('totp-token', totpInvalid);

    expect(response.status).toBe(403);
    expect(response.body).toBeTruthy();
    expect(response.body.exception).toBeTruthy();
  });

  test('Should response 201 when PATCH /public/v1/users/password and provide valid totp token', async () => {
    const fakeUpdatePasswordBody = {
      username: cpf.generate(),
      password: faker.internet.password(),
    };
    const secret = Secret.fromHex(sha512(`${fakeUpdatePasswordBody.username}`)).base32;
    const user = {
      id: faker.datatype.uuid(),
      attributes: { cpf: [fakeUpdatePasswordBody.username] },
    } as UserRepresentation;

    const totp = new TOTP({
      secret,
      digits: Config.TOTP.digitsUpdatePassword,
      period: Config.TOTP.periodUpdatePassword,
    });

    const totpValid = totp.generate();

    RedisCacheServiceMock.prototype.getCache.mockResolvedValue(secret);
    KeycloakAdminClientMock.prototype.auth.mockResolvedValue();
    KeycloakAdminClientMock.prototype.users = UsersMock.prototype;
    UsersMock.prototype.find.mockResolvedValue([user]);
    KeycloakConfigMock.getAdmin.mockReturnValue(KeycloakAdminClientMock.prototype);
    UsersMock.prototype.resetPassword.mockResolvedValue();

    const response = await supertest(app)
      .patch('/api/public/v1/users/password')
      .send(fakeUpdatePasswordBody)
      .set('totp-token', totpValid);

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
    expect(response.body).toEqual({});
  });
});
