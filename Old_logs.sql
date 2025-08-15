-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 15, 2025 at 08:43 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `esp_tracker`
--

-- --------------------------------------------------------

--
-- Table structure for table `finished_flags`
--

CREATE TABLE `finished_flags` (
  `work_plan_id` int(11) NOT NULL,
  `is_finished` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

CREATE TABLE `logs` (
  `id` int(11) NOT NULL,
  `work_plan_id` int(11) DEFAULT NULL,
  `process_number` int(11) DEFAULT NULL,
  `status` enum('start','stop') NOT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `process_steps`
--

CREATE TABLE `process_steps` (
  `id` int(11) NOT NULL,
  `job_code` varchar(20) NOT NULL,
  `job_name` varchar(100) NOT NULL,
  `date_recorded` date NOT NULL,
  `worker_count` int(11) DEFAULT NULL,
  `process_number` int(11) NOT NULL,
  `process_description` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `id_code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_plans`
--

CREATE TABLE `work_plans` (
  `id` int(11) NOT NULL,
  `production_date` date NOT NULL,
  `job_code` varchar(50) NOT NULL,
  `job_name` varchar(255) DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_plan_operators`
--

CREATE TABLE `work_plan_operators` (
  `id` int(11) NOT NULL,
  `work_plan_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `id_code` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `finished_flags`
--
ALTER TABLE `finished_flags`
  ADD PRIMARY KEY (`work_plan_id`);

--
-- Indexes for table `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `work_plan_id` (`work_plan_id`);

--
-- Indexes for table `process_steps`
--
ALTER TABLE `process_steps`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_code` (`id_code`);

--
-- Indexes for table `work_plans`
--
ALTER TABLE `work_plans`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `work_plan_operators`
--
ALTER TABLE `work_plan_operators`
  ADD PRIMARY KEY (`id`),
  ADD KEY `work_plan_id` (`work_plan_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `process_steps`
--
ALTER TABLE `process_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `work_plans`
--
ALTER TABLE `work_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `work_plan_operators`
--
ALTER TABLE `work_plan_operators`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `finished_flags`
--
ALTER TABLE `finished_flags`
  ADD CONSTRAINT `finished_flags_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `logs`
--
ALTER TABLE `logs`
  ADD CONSTRAINT `logs_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `work_plan_operators`
--
ALTER TABLE `work_plan_operators`
  ADD CONSTRAINT `work_plan_operators_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
