-- MySQL dump 10.13  Distrib 8.0.32, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: document_db
-- ------------------------------------------------------
-- Server version	8.0.32

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_versions` (
                                     `id` varchar(36) NOT NULL,
                                     `document_id` varchar(36) NOT NULL,
                                     `version_number` int NOT NULL,
                                     `oss_path` varchar(500) NOT NULL,
                                     `oss_url` varchar(500) NOT NULL,
                                     `file_size` bigint NOT NULL,
                                     `modified_by` varchar(36) NOT NULL,
                                     `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                     PRIMARY KEY (`id`),
                                     KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_versions`
--

LOCK TABLES `document_versions` WRITE;
/*!40000 ALTER TABLE `document_versions` DISABLE KEYS */;
INSERT INTO `document_versions` VALUES ('2644b422864641919c33825ef112f9ea','0b375bcf55944f219b92a4d7ffe49471',1,'documents/0b375bcf55944f219b92a4d7ffe49471.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/0b375bcf55944f219b92a4d7ffe49471.pptx',35831,'2','2025-05-12 05:49:22'),('8b450ac796434c49a3e4730e139e8fde','1e68f8d0a5f246dc8487be5fa7e37f64',1,'documents/1e68f8d0a5f246dc8487be5fa7e37f64.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/1e68f8d0a5f246dc8487be5fa7e37f64.pptx',35831,'2','2025-05-12 05:49:56'),('8d64d01205c2468aadfdbe6cca893cba','0dedc131a62f4657b58b0553048ad3d6',1,'documents/0dedc131a62f4657b58b0553048ad3d6.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/0dedc131a62f4657b58b0553048ad3d6.pptx',35831,'2','2025-05-12 05:50:22'),('dd035cfa8f91460492c0770d486fced1','31edf5d899124223b77f51f4c5e2c758',1,'documents/31edf5d899124223b77f51f4c5e2c758.docx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/31edf5d899124223b77f51f4c5e2c758.docx',201242,'2','2025-05-12 05:09:07'),('e191d6967069490da9a279fe5d5c44ed','f4279513784a45b4adc3ee9dea479fa3',1,'documents/f4279513784a45b4adc3ee9dea479fa3.xlsx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/f4279513784a45b4adc3ee9dea479fa3.xlsx',36346,'2','2025-05-12 05:44:22');
/*!40000 ALTER TABLE `document_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
                             `id` varchar(36) NOT NULL,
                             `title` varchar(255) NOT NULL,
                             `description` text,
                             `file_type` varchar(50) NOT NULL,
                             `file_size` bigint NOT NULL,
                             `oss_path` varchar(500) NOT NULL,
                             `oss_url` varchar(500) NOT NULL,
                             `user_id` varchar(36) NOT NULL,
                             `folder_id` varchar(36) DEFAULT NULL,
                             `version` int DEFAULT '1',
                             `is_deleted` tinyint(1) DEFAULT '0',
                             `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                             `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                             PRIMARY KEY (`id`),
                             KEY `idx_user_id` (`user_id`),
                             KEY `idx_folder_id` (`folder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES ('0b375bcf55944f219b92a4d7ffe49471','报告','毕设中期报告','pptx',35831,'documents/0b375bcf55944f219b92a4d7ffe49471.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/0b375bcf55944f219b92a4d7ffe49471.pptx','2','8375bdf4b3a841598447ba01a76f8adc',1,1,'2025-05-12 05:49:22','2025-05-12 05:50:04'),('0dedc131a62f4657b58b0553048ad3d6','演示','演示','pptx',35831,'documents/0dedc131a62f4657b58b0553048ad3d6.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/0dedc131a62f4657b58b0553048ad3d6.pptx','2','8375bdf4b3a841598447ba01a76f8adc',1,0,'2025-05-12 05:50:22','2025-05-12 05:50:22'),('1e68f8d0a5f246dc8487be5fa7e37f64','演示','演示2','pptx',35831,'documents/1e68f8d0a5f246dc8487be5fa7e37f64.pptx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/1e68f8d0a5f246dc8487be5fa7e37f64.pptx','2','8375bdf4b3a841598447ba01a76f8adc',1,1,'2025-05-12 05:49:56','2025-05-12 05:54:21'),('31edf5d899124223b77f51f4c5e2c758','论文模板','毕设论文模板','docx',201242,'documents/31edf5d899124223b77f51f4c5e2c758.docx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/31edf5d899124223b77f51f4c5e2c758.docx','2','367b52ff235f46ca8e1b1c88e83abf3e',1,0,'2025-05-12 05:09:07','2025-05-12 05:09:07'),('f4279513784a45b4adc3ee9dea479fa3','柯南','柯南收藏列表','xlsx',36346,'documents/f4279513784a45b4adc3ee9dea479fa3.xlsx','https://mediaminds.oss-cn-beijing.aliyuncs.com/documents/f4279513784a45b4adc3ee9dea479fa3.xlsx','2','9adc44340aff4f02a9d8dbaf79aca275',1,0,'2025-05-12 05:44:22','2025-05-12 05:44:22');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `folders`
--

DROP TABLE IF EXISTS `folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `folders` (
                           `id` varchar(36) NOT NULL,
                           `name` varchar(255) NOT NULL,
                           `user_id` varchar(36) NOT NULL,
                           `parent_id` varchar(36) DEFAULT NULL,
                           `is_deleted` tinyint(1) DEFAULT '0',
                           `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                           `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           PRIMARY KEY (`id`),
                           KEY `idx_user_id` (`user_id`),
                           KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folders`
--

LOCK TABLES `folders` WRITE;
/*!40000 ALTER TABLE `folders` DISABLE KEYS */;
INSERT INTO `folders` VALUES ('367b52ff235f46ca8e1b1c88e83abf3e','Word','2',NULL,0,'2025-05-12 05:07:32','2025-05-12 05:07:32'),('8375bdf4b3a841598447ba01a76f8adc','PPT','2',NULL,0,'2025-05-12 05:39:23','2025-05-12 05:39:23'),('9adc44340aff4f02a9d8dbaf79aca275','Excle','2',NULL,0,'2025-05-12 05:39:30','2025-05-12 05:39:30');
/*!40000 ALTER TABLE `folders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-12 19:13:37
