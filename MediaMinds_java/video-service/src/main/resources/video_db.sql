-- MySQL dump 10.13  Distrib 8.0.32, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: video_db
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
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
                            `id` bigint NOT NULL AUTO_INCREMENT,
                            `name` varchar(50) NOT NULL,
                            `description` varchar(255) DEFAULT NULL,
                            `parent_id` bigint DEFAULT NULL,
                            `sort_order` int DEFAULT '0',
                            `create_time` datetime NOT NULL,
                            `update_time` datetime NOT NULL,
                            PRIMARY KEY (`id`),
                            UNIQUE KEY `uk_category_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,'动作片','以打斗、枪战、爆炸等激烈场面为主要内容的电影类型',NULL,1,'2020-09-01 10:00:00','2020-09-01 10:00:00'),(2,'喜剧片','以诙谐、幽默的方式表现生活，给观众带来欢笑的电影类型',NULL,2,'2020-09-01 10:05:00','2020-09-01 10:05:00'),(3,'爱情片','以爱情故事为主线的电影类型',NULL,3,'2020-09-01 10:10:00','2020-09-01 10:10:00'),(4,'科幻片','以科学幻想为主题的电影类型',NULL,4,'2020-09-01 10:15:00','2020-09-01 10:15:00'),(5,'恐怖片','以引起观众恐惧心理为目的的电影类型',NULL,5,'2020-09-01 10:20:00','2020-09-01 10:20:00'),(6,'动画片','由动画制作而成的电影类型',NULL,6,'2020-09-01 10:25:00','2020-09-01 10:25:00'),(7,'剧情片','以情节和角色发展为核心的电影类型',NULL,7,'2020-09-01 10:30:00','2020-09-01 10:30:00'),(8,'冒险片','以探险、冒险为主题的电影类型',NULL,8,'2020-09-01 10:35:00','2020-09-01 10:35:00'),(9,'奇幻片','含有魔法、超自然元素的电影类型',NULL,9,'2020-09-01 10:40:00','2020-09-01 10:40:00'),(10,'犯罪片','以犯罪和侦探为主题的电影类型',NULL,10,'2020-09-01 10:45:00','2020-09-01 10:45:00');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment`
--

DROP TABLE IF EXISTS `comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment` (
                           `id` bigint NOT NULL AUTO_INCREMENT,
                           `create_time` datetime NOT NULL,
                           `update_time` datetime NOT NULL,
                           `content` varchar(512) NOT NULL,
                           `rate` decimal(19,2) NOT NULL,
                           `user_id` varchar(20) NOT NULL,
                           `movie_id` bigint NOT NULL,
                           PRIMARY KEY (`id`),
                           KEY `FKtdpkp5fleo773wbsiqec0y5er` (`user_id`),
                           KEY `FK95583yxmyntkckphhs5ktmknr` (`movie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment`
--

LOCK TABLES `comment` WRITE;
/*!40000 ALTER TABLE `comment` DISABLE KEYS */;
INSERT INTO `comment` VALUES (1,'2020-10-06 13:26:41','2020-10-06 13:26:41','真的很不错！',9.00,'3',1),(2,'2020-10-06 13:27:25','2020-10-06 13:27:25','太好了，好久没看到这样的电影了！！！',10.00,'3',1),(3,'2020-10-06 13:46:32','2020-10-06 13:46:32','感觉很一般嘛，搞得历史正剧魔幻化！！！',6.00,'3',2),(4,'2020-10-06 13:46:54','2020-10-06 13:46:54','还没看过，感觉很不错的样子。',9.00,'3',3),(5,'2020-10-06 13:47:13','2020-10-06 13:47:13','这个枕边没看过。',9.00,'3',4),(6,'2020-10-06 13:47:36','2020-10-06 13:47:36','这个电影爽的一批，很好看，强烈建议！',9.00,'3',5),(7,'2020-10-06 13:47:59','2020-10-06 13:47:59','星爷的经典，必须满分！',10.00,'3',6),(8,'2020-10-06 15:09:05','2020-10-06 15:09:05','又看了一遍，真的太好了！',9.00,'3',1),(9,'2020-10-06 15:10:39','2020-10-06 15:10:39','好好好好好好好好好好好好好好好好好好好好好好好好好好好好！',9.00,'3',6),(10,'2020-10-06 20:15:21','2020-10-06 20:15:21','战狼牛逼！！！',10.00,'3',14),(11,'2020-10-06 23:34:16','2020-10-06 23:34:16','吴京是我一直最喜欢的明星！',9.00,'2',14),(12,'2020-10-06 23:34:39','2020-10-06 23:34:39','京哥最牛，天下无敌！',10.00,'2',14),(14,'2020-12-24 17:37:05','2020-12-24 17:37:05','这个电影不错，很值得看',10.00,'5',14);
/*!40000 ALTER TABLE `comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite`
--

DROP TABLE IF EXISTS `favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorite` (
                            `id` bigint NOT NULL AUTO_INCREMENT,
                            `user_id` varchar(20) NOT NULL,
                            `movie_id` bigint NOT NULL,
                            `create_time` datetime NOT NULL,
                            PRIMARY KEY (`id`),
                            UNIQUE KEY `uk_user_movie_favorite` (`user_id`,`movie_id`),
                            KEY `idx_user_id` (`user_id`),
                            KEY `idx_movie_id` (`movie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite`
--

LOCK TABLES `favorite` WRITE;
/*!40000 ALTER TABLE `favorite` DISABLE KEYS */;
INSERT INTO `favorite` VALUES (1,'1',1,'2020-10-01 14:30:00'),(2,'1',6,'2020-10-02 16:45:00'),(3,'1',14,'2020-10-03 19:20:00'),(4,'2',14,'2020-10-03 15:10:00'),(5,'2',6,'2020-10-04 11:25:00'),(6,'3',1,'2020-10-05 20:15:00'),(7,'3',5,'2020-10-06 18:30:00'),(8,'3',6,'2020-10-07 21:40:00'),(9,'4',10,'2020-10-08 13:15:00'),(10,'4',16,'2020-10-09 14:50:00'),(11,'5',14,'2020-10-10 17:25:00'),(12,'5',8,'2020-10-11 19:30:00'),(13,'2',17,'2025-05-11 12:14:42');
/*!40000 ALTER TABLE `favorite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `like`
--

DROP TABLE IF EXISTS `like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `like` (
                        `id` bigint NOT NULL AUTO_INCREMENT,
                        `user_id` varchar(20) NOT NULL,
                        `target_id` bigint NOT NULL,
                        `target_type` tinyint NOT NULL COMMENT '1:视频 2:评论',
                        `create_time` datetime NOT NULL,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uk_user_target` (`user_id`,`target_id`,`target_type`),
                        KEY `idx_target` (`target_id`,`target_type`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `like`
--

LOCK TABLES `like` WRITE;
/*!40000 ALTER TABLE `like` DISABLE KEYS */;
INSERT INTO `like` VALUES (1,'1',1,1,'2020-10-15 14:30:00'),(2,'1',6,1,'2020-10-16 16:45:00'),(3,'1',1,2,'2020-10-17 19:20:00'),(4,'2',14,1,'2020-10-18 15:10:00'),(5,'2',10,2,'2020-10-19 11:25:00'),(6,'3',1,1,'2020-10-20 20:15:00'),(7,'3',5,1,'2020-10-21 18:30:00'),(8,'3',2,2,'2020-10-22 21:40:00'),(9,'4',10,1,'2020-10-23 13:15:00'),(10,'4',7,2,'2020-10-24 14:50:00'),(11,'5',14,1,'2020-10-25 17:25:00'),(12,'5',14,2,'2020-10-26 19:30:00');
/*!40000 ALTER TABLE `like` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie`
--

DROP TABLE IF EXISTS `movie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie` (
                         `id` bigint NOT NULL AUTO_INCREMENT,
                         `create_time` datetime NOT NULL,
                         `update_time` datetime NOT NULL,
                         `abs` varchar(128) DEFAULT NULL,
                         `actor` varchar(512) NOT NULL,
                         `area` int DEFAULT NULL,
                         `directed_by` varchar(64) NOT NULL,
                         `info` varchar(1280) DEFAULT NULL,
                         `language` int NOT NULL,
                         `name` varchar(64) NOT NULL,
                         `picture` varchar(512) DEFAULT NULL,
                         `rate` decimal(19,2) DEFAULT NULL,
                         `show_time` datetime DEFAULT NULL,
                         `time` int DEFAULT NULL,
                         `type` varchar(128) DEFAULT NULL,
                         `video` varchar(512) DEFAULT NULL,
                         `rate_count` int DEFAULT NULL,
                         PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie`
--

LOCK TABLES `movie` WRITE;
/*!40000 ALTER TABLE `movie` DISABLE KEYS */;
INSERT INTO `movie` VALUES (1,'2020-09-14 21:11:31','2020-10-07 13:07:49','月黑高飞(港) / 刺激1995(台) / 地狱诺言 / 铁窗岁月 / 消香克的救赎',' 蒂姆·罗宾斯 / 摩根·弗里曼 / 鲍勃·冈顿 / 威廉姆·赛德勒 / 克兰西·布朗 / 吉尔·贝罗斯 / 马克·罗斯顿 ',3,'弗兰克·德拉邦特','20世纪40年代末，小有成就的青年银行家安迪（蒂姆·罗宾斯 Tim Robbins 饰）因涉嫌杀害妻子及她的情人而锒铛入狱。在这座名为鲨堡的监狱内，希望似乎虚无缥缈，终身监禁的惩罚无疑注定了安迪接下来灰暗绝望的人生。未过多久，安迪尝试接近囚犯中颇有声望的瑞德（摩根·弗 里曼 Morgan Freeman 饰），请求对方帮自己搞来小锤子。以此为契机，二人逐渐熟稔，安迪也仿佛在鱼龙混杂、罪恶横生、黑白混淆的牢狱中找到属于自己的求生之道。他利用自身的专业知识，帮助监狱管理层逃税、洗黑钱，同时凭借与瑞德的交往在犯人中间也渐渐受到礼遇。表面看来，他已如瑞德那样对那堵高墙从憎恨转变为处之泰然，但是对自由的渴望仍促使他朝着心中的希望和目标前进。而关于其罪行的真相，似乎更使这一切朝前推进了一步…… \r\n　　本片根据著名作家斯蒂芬·金（Stephen Edwin King）的原著改编。',1,'肖申克的救赎 The Shawshank Redemption (1994)','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200914/1600088979472.jpg',9.51,'1994-09-10 23:55:00',142,'Plot,Other','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20201006/1601998356103.mp4',4),(2,'2020-09-17 21:49:32','2020-10-06 13:46:32','花木兰 Mulan (2020)',' 刘亦菲 / 甄子丹 / 巩俐 / 李连杰 / 李截 / 安柚鑫',3,'妮琪·卡罗','迪士尼影业荣誉出品《花木兰》由备受赞誉的电影导演妮基·卡罗执导，将中国传奇战士的史诗故事全新呈现。影片讲述了一位无所畏惧的年轻女子义无反顾为家国而战，成为中国史上最著名的伟大勇士之一。当皇帝下令境内每个家庭必须有一位男丁应召出征，抵御北方来犯者入侵，出身军戎之家的长女花木兰，挺身而出，替病痛缠身的父亲应征入伍。她女扮男装化名“花军”，一路历经磨练，驾驭自己内心的力量，激发真正的潜能。通过这段传奇历程，她将成为一名光荣的勇士，不仅赢得国家的认可，更博得父亲的骄傲。',1,'花木兰 Mulan (2020)','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200917/1600350485608.jpg',6.00,'2020-09-11 00:00:00',115,'Action,Plot,Science','',1),(3,'2020-09-19 10:37:42','2020-10-06 13:46:54','墨西哥亡灵节','盖尔·加西亚·贝纳尔 / 安东尼·冈萨雷斯 / 本杰明·布拉特 / 芮妮·维克托 / 安娜·奥菲丽亚·莫吉亚',3,'李·昂克里奇 / 阿德里安·莫利纳','寻梦环游记',0,'寻梦环游记','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600482941012.jpg',9.00,'2020-09-19 00:00:00',105,'Comedy,Action,Science,Cartoon,Horror','',1),(4,'2020-09-19 10:39:55','2020-10-06 13:47:13','','安娜·肯德里克,贾斯汀·汀布莱克,詹米·多南,山姆·洛克威尔,詹姆斯·柯登',3,'迈克·米歇尔, 大卫·史密斯','魔发精灵2',1,'魔发精灵2','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600483140287.jpg',9.00,'2020-09-17 00:00:00',90,'Comedy,Plot,Science,Cartoon,Other','',1),(5,'2020-09-19 10:44:29','2020-10-06 13:47:36','','威尔·史密斯,马丁·劳伦斯',3,'阿迪尔·埃尔·阿比, 比拉勒·法拉赫','曾制作《珍珠港》、《壮志凌云》、《加勒比海盗》系列等爆款电影的好莱坞金牌制片人全新倾力打造的《绝地战警：疾速追击》，讲述了迈阿密警员麦克（威尔·史密斯饰）遭遇神秘黑帮势力的暗杀伏击，为了迎战势力庞大火力惊人的黑帮分子，解决隐藏在暗处的危机，麦克找回曾经的搭档马库斯（马丁·劳伦斯饰），“嘴炮二人组”再度集结开启沙雕模式，不仅时刻上演逗比互怼，更在迈阿密街头与黑帮展开空前绝后的飙车枪战大戏。这对最佳搭档究竟能否在枪林弹雨下突出重围，找出幕后黑手完成绝地反杀？',1,'绝地战警：疾速追击','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600483323364.jpg',9.00,'2018-09-13 00:00:00',124,'Love,Comedy,Action,Plot,Science,Horror,Crime','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600483423387.mp4',1),(6,'2020-09-19 10:52:20','2020-10-06 15:10:39','一生所爱','周星驰 / 吴孟达 / 朱茵 / 蔡少芬 / 蓝洁瑛',1,'刘镇伟','大话西游之大圣娶亲',2,'大话西游之大圣娶亲','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600483728314.jpg',9.50,'1996-06-12 00:00:00',95,'Love,Comedy,Action,Science,Fantasy,Adventure','',2),(7,'2020-09-19 10:56:07','2020-09-19 10:56:07','殊死一搏的较量','肖央,谭卓,陈冲,姜皓文,秦沛',0,'柯汶利','误杀——殊死一搏的较量！！！',0,'误杀','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600484100745.jpg',9.54,'2019-07-19 00:00:00',110,'Action,Plot,Horror,Crime','',0),(8,'2020-09-19 11:01:15','2020-09-19 11:01:15','生而为魔,那又如何?',' 吕艳婷 / 囧森瑟夫 / 瀚墨 / 陈浩 / 绿绮 / 张珈铭 / 杨卫',0,'饺子','天地灵气孕育出一颗能量巨大的混元珠，元始天尊将混元珠提炼成灵珠和魔丸，灵珠投胎为人，助周伐纣时可堪大用；而魔丸则会诞出魔王，为祸人间。元始天尊启动了天劫咒语，3年后天雷将会降临，摧毁魔丸。太乙受命将灵珠托生于陈塘关李靖家的儿子哪吒身上。然而阴差阳错，灵珠和魔丸竟然被掉包。本应是灵珠英雄的哪吒却成了混世大魔王。调皮捣蛋顽劣不堪的哪吒却徒有一颗做英雄的心。然而面对众人对魔丸的误解和即将来临的天雷的降临，哪吒是否命中注定会立地成魔？他将何去何从？',0,'哪吒之魔童降世','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600484294052.jpg',8.65,'2019-10-24 00:00:00',110,'Action,Plot,Science,Cartoon,Fantasy,Adventure','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600484404952.mp4',0),(9,'2020-09-19 11:13:02','2020-09-19 11:13:02','','马思纯,钟楚曦,黄景瑜',0,'徐展雄','荞麦疯长',0,'荞麦疯长','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600484548575.jpg',9.34,'2020-09-10 00:00:00',112,'Love,Plot','',0),(10,'2020-09-19 11:16:45','2020-09-19 11:16:45','四百人对外号称八百人','王千源,张译,姜武,黄志忠,张俊一,欧豪,张承',0,'管虎','1937年淞沪会战的最后一役，“八百壮士”奉命坚守上海四行仓库，以少敌多顽强抵抗四天四夜。电影《八佰》由管虎导演，是亚洲首部全片使用IMAX摄影机拍摄的商业电影，将于2020年8月21日全国影院上映。',0,'八佰','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600485202576.jpg',8.45,'2020-08-17 00:00:00',147,'Action,Plot,Adventure','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600485398822.mp4',0),(11,'2020-09-19 11:24:38','2020-09-19 11:24:38','穿越时空的爱 / Love You Forever','李鸿其 / 李一桐 / 范伟 / 张超 / 罗辑 / 郭欣禹',0,' 姚婷婷','林格（李鸿其 饰）人生所有美好的记忆，都与邱倩（李一桐 饰）有关。一场意外、一块神奇的表彻底改变了两人的人生......时空不断被重置，唯一不变的，是爱你如初的心。',0,'我在时间尽头等你','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600485771101.jpg',9.35,'2020-08-25 00:00:00',120,'Love,Fantasy','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600485821794.mp4',0),(12,'2020-09-19 11:28:33','2020-09-19 11:28:49','二分之一的魔法 / 魔法环游记 / 勇往直前 / 觅法奇程 / ½的魔法 / 向前','汤姆·赫兰德 / 克里斯·帕拉特 / 茱莉亚·路易斯-德瑞弗斯',3,'丹·斯坎隆','影片设定在一个由精灵、巨魔和灵魂等组成的郊外幻想世界，在那里独角兽在垃圾桶中穿行，像是有着糖果条纹的负鼠。影片提供了一个前提，即魔法是真实的，但它早已被现代技术所遗忘和取代。一对十几岁的兄弟，在他们尚不更事时父亲便已离世，他们决定进入这个幻想世界，与父亲共度最后一个神奇的日子。霍兰德配音弟弟伊安、帕拉特配音聒噪的哥哥、德瑞弗斯配音兄弟二人的母亲、斯宾瑟则会利用其声线的优势。',1,'1/2的魔法 Onward ','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600486054872.jpg',9.35,'2020-08-19 00:00:00',102,'Action,Science,Cartoon,Fantasy,Adventure','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600486065711.mp4',0),(13,'2020-09-19 11:32:53','2020-09-19 11:32:53','鱼游回来了','季冠霖 / 苏尚卿 / 许魏洲 / 金士杰 / 杨婷 / 潘淑兰 / 九儿',0,'梁旋 / 张春','所有活着的人类，都是海里一条巨大的鱼；出生的时候他们从海的此岸出发。他们的生命就像横越大海，有时相遇，有时分开……死的时候，他们便到了岸，各去各的世界。 \r\n　　四十五亿年前，这个星球上，只有一片汪洋大海，和一群古老的大鱼。在与人类世界平行的空间里，生活着一个规规矩矩、遵守秩序的族群，他们为神工作，掌管世界万物运行规律，也掌管人类的灵魂。他们的天空与人类世界的大海相连。他们既不是神，也不是人，他们是“其他人”。 \r\n　　十六岁生日那天，居住在“神之围楼”里的一个名叫椿（季冠霖 配音）的女孩变作一条海豚到人间巡礼，被大海中的一张网困住，一个人类男孩因为救她而落入深海死去。为了报恩，为了让人类男孩复活，她需要在自己的世界里，历经种种困难与阻碍，帮助死后男孩的灵魂——一条拇指那么大的小鱼，成长为一条比鲸更巨大的鱼并回归大海。',0,'大鱼海棠','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600486339390.jpg',8.56,'2020-09-05 00:00:00',105,'Science,Cartoon,Fantasy','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600486348627.mp4',0),(14,'2020-09-19 11:37:09','2020-12-24 17:37:05','新战狼 / 新战死沙场 / Wolf Warriors 2',' 吴京 / 弗兰克·格里罗 / 吴刚 / 张翰 / 卢靖姗 / 丁海峰 / 淳于珊珊 / 余男 / 于谦',0,'吴京','由于一怒杀害了强拆牺牲战友房子的恶霸，屡立功勋的冷锋（吴京 饰）受到军事法庭的判决。在押期间，亲密爱人龙小云壮烈牺牲。出狱后，冷锋辗转来到非洲，他辗转各地，只为寻找杀害小云的凶手。在此期间，冷锋逗留的国家发生叛乱，叛徒红巾军大开杀戒，血流成河。中国派出海军执行撤侨任务，期间冷锋得知有一位陈博士被困在五十五公里外的医院，而叛军则试图抓住这位博士。而从另一位华侨（于谦 饰）口中得知，杀害小云的凶手正待在这个国家。 \r\n　　在无法得到海军支援的情况下，冷锋只身闯入硝烟四起的战场。不屈不挠的战狼，与冷酷无情的敌人展开悬殊之战……',0,'战狼2 (2017)','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600486597046.jpg',9.23,'2017-08-15 00:00:00',123,'Action,Plot,Horror,Adventure','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600486614347.mp4',4),(15,'2020-09-19 11:41:53','2020-09-19 11:41:53','失忆白蛇','张喆 / 杨天翔 / 唐小喜 / 刘薇 / 张遥函 /',0,'黄家康, 赵霁','幽暗洞中，白蛇（张喆 配音）苦苦修炼却不得其法，小青见此情景，将发髻上的碧玉簪子取下，令白蛇攥在手中。那一刻，五百年前的记忆瞬间苏醒。五百年前，晚唐君主昏聩庸碌，掌握邪术的国师只手遮天，命令天下百姓捕蛇修法。为了拯救族群，白蛇冒险行刺，结果却遭遇挫败，还失去了记忆。当她再度醒来，发现自己被一个专门捕蛇的村落所救下，而那个胆小却善良的青年许宣（杨天翔 配音）则吸引了白蛇的注意。与此同时，国师派出爪牙四处追寻白蛇的下落，而蛇族更误解白蛇叛逃人类，接二连三派出杀手。 \r\n　　五百年后的一段姻缘，早在这乱世之间便已缔结……',0,'白蛇：缘起','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600486820658.jpg',8.45,'2020-09-02 00:00:00',99,'Science,Cartoon,Fantasy','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600486864383.mp4',0),(16,'2020-09-19 11:48:17','2020-09-19 11:48:17','星际启示录(港) / 星际效应(台) / 星际空间 / 星际之间 / 星际远航 / 星际 / Flora\'s Letter',' 马修·麦康纳 / 安妮·海瑟薇 / 杰西卡·查斯坦 / 麦肯吉·弗依 / 卡西·阿弗莱克 / 迈克尔·凯恩 / 马特·达蒙 / 蒂莫西·柴勒梅德',3,'克里斯托弗·诺兰','近未来的地球黄沙遍野，小麦、秋葵等基础农作物相继因枯萎病灭绝，人类不再像从前那样仰望星空，放纵想象力和灵感的迸发，而是每日在沙尘暴的肆虐下倒数着所剩不多的光景。在家务农的前NASA宇航员库珀（马修·麦康纳 Matthew McConaughey 饰）接连在女儿墨菲（麦肯吉·弗依 Mackenzie Foy 饰）的书房发现奇怪的重力场现象，随即得知在某个未知区域内前NASA成员仍秘密进行一个拯救人类的计划。多年以前土星附近出现神秘虫洞，NASA借机将数名宇航员派遣到遥远的星系寻找适合居住的星球。在布兰德教授（迈克尔·凯恩 Michael Caine 饰）的劝说下，库珀忍痛告别了女儿，和其他三名专家教授女儿艾米莉亚·布兰德（安妮·海瑟薇 Anne Hathaway 饰）、罗米利（大卫·吉雅西 David Gyasi 饰）、多伊尔（韦斯·本特利 Wes B... ',1,'星际穿越 Interstellar','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200919/1600487196617.jpg',9.34,'2014-07-18 00:00:00',169,'Plot,Science,Fantasy,Adventure','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200919/1600487204030.mp4',0),(17,'2020-09-24 21:20:20','2020-09-24 21:31:50','','黄渤 /王宝强 /刘昊然 /佟丽娅 /葛优',0,'宁浩 /徐峥','电影《我和我的家乡》定档2020年国庆，延续《我和我的祖国》集体创作的方式，由张艺谋担当总监制，宁浩担任总导演，张一白担任总策划，宁浩、徐峥、陈思诚、闫非&彭大魔、邓超&俞白眉分别执导五个故事。',0,'我和我的家乡','https://mediaminds.oss-cn-beijing.aliyuncs.com/videoPic/20200924/1600953564633.jpg',8.99,'2020-10-01 00:00:00',110,'Comedy,Plot,Other','https://mediaminds.oss-cn-beijing.aliyuncs.com/video/20200924/1600954305605.mp4',0);
/*!40000 ALTER TABLE `movie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_category`
--

DROP TABLE IF EXISTS `movie_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_category` (
                                  `id` bigint NOT NULL AUTO_INCREMENT,
                                  `movie_id` bigint NOT NULL,
                                  `category_id` bigint NOT NULL,
                                  PRIMARY KEY (`id`),
                                  UNIQUE KEY `uk_movie_category` (`movie_id`,`category_id`),
                                  KEY `fk_movie_category_movie` (`movie_id`),
                                  KEY `fk_movie_category_category` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_category`
--

LOCK TABLES `movie_category` WRITE;
/*!40000 ALTER TABLE `movie_category` DISABLE KEYS */;
INSERT INTO `movie_category` VALUES (1,1,7),(2,2,1),(3,3,6),(4,4,6),(5,5,1),(6,5,10),(7,6,2),(8,6,3),(9,7,10),(10,8,6),(11,8,9),(12,9,3),(13,10,1),(14,10,7),(15,11,3),(16,12,4),(17,12,6),(18,13,6),(19,13,9),(20,14,1),(21,15,6),(22,15,9),(23,16,4),(24,16,8),(25,17,2),(26,17,7);
/*!40000 ALTER TABLE `movie_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movie_tag`
--

DROP TABLE IF EXISTS `movie_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movie_tag` (
                             `id` bigint NOT NULL AUTO_INCREMENT,
                             `movie_id` bigint NOT NULL,
                             `tag_id` bigint NOT NULL,
                             PRIMARY KEY (`id`),
                             UNIQUE KEY `uk_movie_tag` (`movie_id`,`tag_id`),
                             KEY `fk_movie_tag_movie` (`movie_id`),
                             KEY `fk_movie_tag_tag` (`tag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movie_tag`
--

LOCK TABLES `movie_tag` WRITE;
/*!40000 ALTER TABLE `movie_tag` DISABLE KEYS */;
INSERT INTO `movie_tag` VALUES (1,1,1),(2,1,3),(3,1,8),(4,2,2),(5,2,7),(7,3,3),(6,3,9),(9,4,4),(8,4,9),(10,5,2),(11,5,8),(12,6,1),(13,6,4),(14,6,7),(15,7,5),(16,7,7),(18,8,7),(17,8,9),(20,9,3),(19,9,7),(22,10,2),(21,10,7),(23,11,3),(24,11,7),(25,12,9),(26,12,10),(27,13,9),(28,13,10),(29,14,2),(30,14,7),(31,15,9),(32,15,10),(33,16,1),(34,16,8),(35,17,4),(36,17,7);
/*!40000 ALTER TABLE `movie_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recommendation`
--

DROP TABLE IF EXISTS `recommendation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recommendation` (
                                  `id` bigint NOT NULL AUTO_INCREMENT,
                                  `user_id` varchar(20) NOT NULL,
                                  `movie_id` bigint NOT NULL,
                                  `score` decimal(10,6) NOT NULL,
                                  `reason` varchar(255) DEFAULT NULL,
                                  `create_time` datetime NOT NULL,
                                  `status` tinyint DEFAULT '0',
                                  PRIMARY KEY (`id`),
                                  KEY `idx_user_id` (`user_id`),
                                  KEY `idx_movie_id` (`movie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recommendation`
--

LOCK TABLES `recommendation` WRITE;
/*!40000 ALTER TABLE `recommendation` DISABLE KEYS */;
INSERT INTO `recommendation` VALUES (1,'1',5,0.850000,'根据您喜欢的动作电影推荐','2020-12-01 10:30:00',0),(2,'1',8,0.820000,'根据您观看的动画电影推荐','2020-12-01 10:35:00',0),(3,'1',16,0.780000,'大多数用户都喜欢这部电影','2020-12-01 10:40:00',0),(4,'2',1,0.920000,'根据您观看的经典电影推荐','2020-12-02 11:30:00',0),(5,'2',5,0.860000,'根据您喜欢的动作电影推荐','2020-12-02 11:35:00',0),(6,'2',13,0.790000,'根据您观看的动画电影推荐','2020-12-02 11:40:00',0),(7,'3',14,0.950000,'根据您喜欢的动作电影推荐','2020-12-03 12:30:00',0),(8,'3',8,0.880000,'根据您观看的动画电影推荐','2020-12-03 12:35:00',0),(9,'3',16,0.840000,'大多数用户都喜欢这部电影','2020-12-03 12:40:00',0),(10,'4',1,0.910000,'根据您观看的经典电影推荐','2020-12-04 13:30:00',0),(11,'4',6,0.870000,'根据您喜欢的喜剧电影推荐','2020-12-04 13:35:00',0),(12,'4',14,0.830000,'大多数用户都喜欢这部电影','2020-12-04 13:40:00',0),(13,'5',1,0.900000,'根据您观看的经典电影推荐','2020-12-05 14:30:00',0),(14,'5',6,0.850000,'根据您喜欢的喜剧电影推荐','2020-12-05 14:35:00',0),(15,'5',16,0.810000,'大多数用户都喜欢这部电影','2020-12-05 14:40:00',0);
/*!40000 ALTER TABLE `recommendation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tag`
--

DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
                       `id` bigint NOT NULL AUTO_INCREMENT,
                       `create_time` datetime NOT NULL,
                       `update_time` datetime NOT NULL,
                       `name` varchar(50) NOT NULL,
                       `description` varchar(255) DEFAULT NULL,
                       PRIMARY KEY (`id`),
                       UNIQUE KEY `uk_tag_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tag`
--

LOCK TABLES `tag` WRITE;
/*!40000 ALTER TABLE `tag` DISABLE KEYS */;
INSERT INTO `tag` VALUES (1,'2020-09-05 10:00:00','2020-09-05 10:00:00','经典','经典作品，经久不衰'),(2,'2020-09-05 10:05:00','2020-09-05 10:05:00','热血','充满激情和斗志的内容'),(3,'2020-09-05 10:10:00','2020-09-05 10:10:00','感人','能够引起观众情感共鸣的内容'),(4,'2020-09-05 10:15:00','2020-09-05 10:15:00','搞笑','令人捧腹的内容'),(5,'2020-09-05 10:20:00','2020-09-05 10:20:00','悬疑','含有谜团和悬念的内容'),(6,'2020-09-05 10:25:00','2020-09-05 10:25:00','剧情','情节丰富的内容'),(7,'2020-09-05 10:30:00','2020-09-05 10:30:00','华语','中国大陆、香港、台湾等华语地区制作的作品'),(8,'2020-09-05 10:35:00','2020-09-05 10:35:00','好莱坞','美国好莱坞制作的作品'),(9,'2020-09-05 10:40:00','2020-09-05 10:40:00','动画','动画制作的作品'),(10,'2020-09-05 10:45:00','2020-09-05 10:45:00','奇幻','含有魔法、超自然元素的作品');
/*!40000 ALTER TABLE `tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_video_interaction`
--

DROP TABLE IF EXISTS `user_video_interaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_video_interaction` (
                                          `id` bigint NOT NULL AUTO_INCREMENT,
                                          `user_id` varchar(20) NOT NULL,
                                          `movie_id` bigint NOT NULL,
                                          `watch_time` int DEFAULT '0',
                                          `watch_progress` decimal(5,2) DEFAULT '0.00',
                                          `last_watch_time` datetime DEFAULT NULL,
                                          `watch_count` int DEFAULT '0',
                                          PRIMARY KEY (`id`),
                                          UNIQUE KEY `uk_user_movie` (`user_id`,`movie_id`),
                                          KEY `fk_interaction_user` (`user_id`),
                                          KEY `fk_interaction_movie` (`movie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_video_interaction`
--

LOCK TABLES `user_video_interaction` WRITE;
/*!40000 ALTER TABLE `user_video_interaction` DISABLE KEYS */;
INSERT INTO `user_video_interaction` VALUES (1,'1',1,135,0.95,'2020-11-01 14:30:00',2),(2,'1',6,90,0.95,'2020-11-02 16:45:00',3),(3,'1',14,100,0.81,'2020-11-03 19:20:00',1),(4,'2',14,123,1.00,'2020-11-04 15:10:00',2),(5,'2',6,95,1.00,'2020-11-05 11:25:00',2),(6,'3',1,142,1.00,'2020-11-06 20:15:00',3),(7,'3',5,124,1.00,'2020-11-07 18:30:00',1),(8,'3',6,95,1.00,'2020-11-08 21:40:00',2),(9,'4',10,120,0.82,'2020-11-09 13:15:00',1),(10,'4',16,140,0.83,'2020-11-10 14:50:00',1),(11,'5',14,123,1.00,'2020-11-11 17:25:00',2),(12,'5',8,80,0.73,'2020-11-12 19:30:00',1),(13,'2',1,1747020706,23.00,'2025-05-12 11:31:47',5),(14,'2',12,1747015407,0.00,'2025-05-12 10:03:27',1);
/*!40000 ALTER TABLE `user_video_interaction` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-12 19:24:26
