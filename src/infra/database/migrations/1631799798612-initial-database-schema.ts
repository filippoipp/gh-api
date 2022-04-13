/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/prefer-default-export */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialDatabaseSchema1631799798612 implements MigrationInterface {
  name = 'initialDatabaseSchema1631799798612';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `abs_user_api`.`user` (`external_id` varchar(255) NOT NULL, `salt_key` varchar(255) NOT NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`external_id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `abs_user_api`.`user_device` (`id` char(36) NOT NULL, `user_id` varchar(255) NOT NULL, `description` varchar(255) NOT NULL, `active` tinyint NOT NULL, `salt_key` varchar(255) NOT NULL, `device_key` varchar(255) NOT NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `abs_user_api`.`role` (`id` char(36) NOT NULL, `name` varchar(255) NOT NULL, `description` varchar(255) NOT NULL, `external_id` varchar(255) NOT NULL, `external_name` varchar(255) NOT NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `abs_user_api`.`user_device` ADD CONSTRAINT `FK_4875276d131a82b6792e73b9b1a` FOREIGN KEY (`user_id`) REFERENCES `abs_user_api`.`user`(`external_id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `abs_user_api`.`user_device` DROP FOREIGN KEY `FK_4875276d131a82b6792e73b9b1a`');
    await queryRunner.query('DROP TABLE `abs_user_api`.`role`');
    await queryRunner.query('DROP TABLE `abs_user_api`.`user_device`');
    await queryRunner.query('DROP TABLE `abs_user_api`.`user`');
  }
}
