-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 23, 2026 at 06:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `syrian_musicians`
--

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `user1_id` int(11) NOT NULL,
  `user2_id` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `user1_id`, `user2_id`, `updated_at`) VALUES
(1, 21, 22, '2026-10-21 09:19:53'),
(2, 21, 23, '2026-10-20 18:57:06'),
(3, 21, 27, '2026-10-21 09:22:04'),
(4, 22, 27, '2026-10-21 12:55:18'),
(5, 22, 23, '2026-10-21 13:54:05'),
(6, 23, 27, '2026-10-21 18:31:18'),
(7, 21, 29, '2026-10-22 19:47:58'),
(9, 23, 29, '2026-10-22 19:47:23'),
(11, 21, 30, '2026-10-23 10:31:42');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `text`, `created_at`, `is_read`) VALUES
(1, 1, 21, 'كيفك استاذ عدنان', '2026-10-20 19:13:40', 1),
(2, 1, 22, 'اهلين سيد داني', '2026-10-21 09:13:19', 1),
(3, 1, 21, 'انا حابب قدم صير عازف بالفرقة اذا ممكن تعملولي مقابلة', '2026-10-21 09:18:51', 1),
(4, 1, 22, 'اي تكرم تعا لعنا الساعة 11 يوم الاحد', '2026-10-21 09:19:32', 1),
(5, 1, 21, 'اوك', '2026-10-21 09:19:48', 1),
(6, 1, 21, 'شكرا كتير استاذ', '2026-10-21 09:19:53', 1),
(7, 3, 21, 'يعطيكن العافية انا عازف كلارينيت اذا عم تدور على شي عازف انا حاهز', '2026-10-21 09:20:56', 1),
(8, 3, 21, 'جاهز*', '2026-10-21 09:21:09', 1),
(9, 3, 27, 'اي منتواصل معك استاذ داني', '2026-10-21 09:21:37', 1),
(10, 3, 27, 'منتشرف فيك اكيد', '2026-10-21 09:21:46', 1),
(11, 3, 27, 'اهلا وسهلا', '2026-10-21 09:22:03', 1),
(12, 7, 21, 'يعطيكن العافية', '2026-10-22 19:45:58', 1),
(13, 7, 21, 'عندي سؤال لو سمحت', '2026-10-22 19:46:06', 1),
(14, 7, 21, 'انا عازف كلارينيت اذا بتحب اني اشتغل عندكن بتمنى تشوف بروفايلي', '2026-10-22 19:46:32', 1),
(15, 7, 29, 'يا هلا', '2026-10-22 19:47:02', 1),
(16, 7, 29, 'اكيد منشوف ومنخبرك', '2026-10-22 19:47:08', 1),
(17, 7, 29, 'شكرا للتواصل', '2026-10-22 19:47:13', 1),
(18, 7, 21, 'العفو', '2026-10-22 19:47:58', 1);

-- --------------------------------------------------------

--
-- Table structure for table `profiles`
--

CREATE TABLE `profiles` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','musician','maestro','restaurant','organizer') NOT NULL,
  `city` varchar(100) NOT NULL,
  `instruments` varchar(255) DEFAULT NULL,
  `attachment` varchar(500) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pending_bio` text DEFAULT NULL,
  `pending_instruments` varchar(255) DEFAULT NULL,
  `pending_attachment` varchar(255) DEFAULT NULL,
  `is_online` tinyint(4) DEFAULT 0,
  `last_active` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `profiles`
--

INSERT INTO `profiles` (`id`, `full_name`, `email`, `password`, `role`, `city`, `instruments`, `attachment`, `avatar`, `bio`, `status`, `created_at`, `pending_bio`, `pending_instruments`, `pending_attachment`, `is_online`, `last_active`) VALUES
(1, 'مدير المنصة', 'admin@syria.com', 'admin12345', 'admin', 'دمشق', NULL, NULL, NULL, NULL, 'approved', '2026-10-19 12:19:05', NULL, NULL, NULL, 0, '2026-10-21 13:36:47'),
(21, 'Dani', 'dani123@syria.com', 'dani12345', 'musician', 'ريف دمشق', 'كلارينيت', '1792431441630-413140218.pdf', NULL, 'عازف كلارينيت عملت مع العديد من الفنانين منهم : رامي غربي - ربيع ابراهيم - سهر ابو شروف -ورد بوخليفة', 'approved', '2026-10-19 17:37:21', NULL, NULL, NULL, 0, '2026-10-23 13:19:34'),
(22, 'Adnan', 'adnan123@syria.com', 'adnan12345', 'maestro', 'دمشق', 'قائد فرقة', '1792431903960-926435412.pdf', NULL, 'قائد الفرقة الوطنية السورية للموسيقا العربية \r\nعملت مع العديد من النجوم العرب :اصالة نصري - مروان محفوظ - جورج نعمة ', 'approved', '2026-10-19 17:45:04', NULL, NULL, NULL, 0, '2026-10-23 12:33:17'),
(29, 'مطعم قصر النرجس', 'narjes123@syria.com', 'narjes12345', 'restaurant', 'دمشق', 'مطعم', '1792697363722-371230978.pdf', NULL, 'مطعم في باب توما راجعوا صفحتنا على الفيسبوك والانستاغرام \r\n', 'approved', '2026-10-22 19:29:24', NULL, NULL, NULL, 0, '2026-10-23 13:19:57'),
(30, 'Majd', 'majd123@syria.com', 'majd12345', 'organizer', 'ريف دمشق', 'متعهد حفلات', '1792697389018-312236005.pdf', NULL, '', 'approved', '2026-10-22 19:29:49', NULL, NULL, NULL, 0, '2026-10-23 13:19:50');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_users` (`user1_id`,`user2_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `profiles`
--
ALTER TABLE `profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
