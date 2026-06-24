# Project Requirements: transyn - Self-Hosted Translation API

**Document Version:** 1.0.1
**Date:** 21/06/2026 - dd/mm/yyyy
**Author:** P4ciuf

---

## 1. Introduction

This document outlines the requirements for "transyn," a self-hosted Translation API designed for developers and SaaS applications. The goal is to provide a reliable, fast, scalable, and controllable translation service without reliance on external APIs with fluctuating costs or limitations.

## 2. Project Goals & Objectives

* **Primary Goal:** To become a viable “DeepL-lite” API solution offering self-hosting capabilities.
* **Objective 1:** Provide a simple and performant RESTful API for language translation.
* **Objective 2:** Minimize external dependencies to ensure control and predictable costs.
* **Objective 3:** Enable easy integration with other SaaS platforms.
* **Objective 4:** Achieve initial MVP functionality on minimal infrastructure (single VPS).

## 3. Functional Requirements

### 3.1 API Functionality

*   **Translation Endpoint:**
    *   Accepts text input in various languages.
    *   Requires a target language parameter.
    *   Returns translated text as the primary output.
    *   Supports character encoding (UTF-8).
*   **Language Support:** Initially support approximately 100 languages using the Hy-MT2 model.  Expandable in future iterations.
*   **Rate Limiting:** Implement initial rate limiting of 100 requests per minute per IP address. Configurable via environment variables.
*   **Error Handling:** Provide informative error messages for invalid input, service errors, and rate limit exceedance.

### 3.2 Background Processes & Services

*   **Caching:** Aggressively cache translation results using Redis to minimize latency and server load.  Cache invalidation strategy will be defined during implementation.
*   **Queuing:** Utilize BullMQ with Redis for asynchronous processing of translation requests, stabilizing the API under heavy load.
*   **Statistics Logging:** Asynchronously log usage statistics (request counts, error rates, language pairs) to MongoDB Atlas.
*   **Model Loading & Management:** Implement a mechanism for loading and potentially updating the Hy-MT2 model.

## 4. Non-Functional Requirements

### 4.1 Performance

*   **Latency:**  Target average translation latency of under [Define target, e.g., 500ms] milliseconds for common language pairs with caching enabled.
*   **Throughput:** The API should be able to handle a minimum of [Define target, e.g., 20 requests per second] concurrent requests within the single VPS environment (considering resource constraints).

### 4.2 Scalability

*   **Initial Scalability:** Designed for horizontal scalability via load balancing and multiple instances on separate servers *when needed*.  MVP focuses on a single server.
*   **Resource Utilization:** Minimize CPU, memory, and network usage to optimize performance within the VPS environment.

### 4.3 Reliability & Availability

*   **Error Handling & Recovery:** Implement robust error handling and recovery mechanisms to ensure service availability even in the face of failures (e.g., Redis downtime).
*   **Monitoring:**  Implement basic monitoring for server health, API response times, queue length, and error rates. Integration with a more comprehensive monitoring solution is planned for future phases.

### 4.4 Security

*   **Rate Limiting:** Prevents abuse and denial-of-service attacks by limiting requests per IP address.
*   **Data Protection:** Ensure secure storage of API keys (if implemented) and prevent unauthorized access to data.

## 5. Technical Requirements & Constraints

*   **Backend Language/Framework:** Node.js with Fastify
*   **Queue System:** BullMQ
*   **Cache & Rate Limiting:** Redis
*   **Machine Learning Inference:** Hy-MT2 (1.8B variant) – Quantized to INT8 or 4-bit for efficient inference on limited resources.
*   **Database (Statistics):** MongoDB Atlas with Mongoose or native driver.
*   **Hosting Environment:** OVHCloud VPS (2027 range - specific configuration details to be confirmed).
* **Domain:** transyn.xyz (with planned subdomains: api, docs, status)

## 6. MVP Scope (Minimum Viable Product)

The initial MVP will focus on delivering a functional translation API with the core features outlined above.  The following are *out of scope* for the MVP and will be considered in subsequent phases:

*   Advanced authentication/authorization mechanisms.
*   Support for more specialized model versions or fine-tuning capabilities.
*   GUI dashboard for monitoring and management.
*   Full suite of documentation beyond basic API reference.
*   Highly granular rate limit configuration per user account (initial implementation uses IP address).
* Complex language detection

## 7. Future Considerations

*   **Expanded Language Support:** Add support for additional languages as the Hy-MT2 model evolves or alternative models are evaluated.
*   **Model Optimization:** Explore more advanced quantization techniques and hardware acceleration to improve inference speed and resource utilization.
*   **API Versioning:** Implement API versioning strategy for future compatibility.
*  **Integration with other platforms**: Provide an easy way of integration with existing applications, such as libraries or SDKs in different languages
