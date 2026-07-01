-- Rebuild FK constraint piket_guru_guruId_fkey karena metadata InnoDB-nya korup
-- (nunjuk ke index yang sudah tidak valid akibat ALTER TABLE manual sebelumnya)

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `piket_guru` DROP FOREIGN KEY `piket_guru_guruId_fkey`;

ALTER TABLE `piket_guru`
  ADD CONSTRAINT `piket_guru_guruId_fkey`
  FOREIGN KEY (`guruId`) REFERENCES `guru` (`id`)
  ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
