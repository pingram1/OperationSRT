# OperationSRT: Identified Failure Modes & Security Holes

**Purpose:** Pre-implementation analysis of gaps, boundary conditions, and failure modes to inform the Vitest unit testing suite. This document catalogs specific holes that tests must cover for production-hardening.

---

## 1. Authentication & Authorization

### 1.1 AuthMiddleware
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `req.user` undefined when `authorize()` runs without `authMiddleware` | Route misconfiguration could bypass auth | `authorize` reads `req.user.role`; undefined throws |
| Malformed JWT (empty string after "Bearer ") | `jwt.verify` throws | Caught, returns 401 |
| JWT signed with wrong secret | Verification fails | Caught, returns 401 |
| Expired token | `TokenExpiredError` | Caught, returns 401 |
| `Authorization: Bearer ` (no token) | `split(' ')[1]` is undefined | `jwt.verify(undefined, ...)` throws |
| `req.user.role` missing or invalid | `authorize` may allow access | `super_admin` bypass; other roles checked via `includes` |

### 1.2 Auth Controller – registerUser
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `name` / `email` as non-string (object, number, array) | `trim()` / `toLowerCase()` throws | Unhandled; 500 with possible stack trace |
| Empty string for `name` | Passes `!name` check | Rejected |
| Whitespace-only `name` / `email` | `trim()` yields `''` | `!name` / `!email` may pass; `findOne({ email: '' })` |
| `role` injection (e.g. `'admin'`) | Privilege escalation | Blocked by `allowedRoles` |
| `password` as number `12345678` | Passes length, hasLetter, hasNumber | May work; bcrypt accepts |
| `password` empty string | `length < 8` | Rejected |
| `studentEmail` malformed / non-existent | Link request fails | Registration succeeds; link request logged only |

### 1.3 Auth Controller – loginUser
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `email` as object/array | `trim().toLowerCase()` throws | Unhandled 500 |
| `password` undefined | `bcrypt.compare(undefined, hash)` | May throw or behave unexpectedly |
| User enumeration via timing | Different response times for "user not found" vs "wrong password" | Both return "Invalid credentials" but timing may differ |

### 1.4 Auth Controller – refreshToken
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `refreshToken` from body as non-string | `jwt.verify` may fail | 401 |
| `refreshToken` valid but for different user | Stale token in DB | Checked via `user.refreshToken !== refreshToken` |
| `decoded.userId` undefined (malformed payload) | `User.findById(undefined)` | Returns null; 401 |

### 1.5 Auth Controller – registerEmployee
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Token in header when admin exists but invalid | `jwt.verify` throws | 403 "Invalid or expired token" |
| Role escalation to `super_admin` when admin exists | Requires valid admin token | Enforced |

---

## 2. Payment Controller

### 2.1 createPaymentIntent
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `amount` = 0, negative, NaN, Infinity | Stripe may reject or create invalid intent | No server-side validation |
| `amount` as string `"65"` | `Math.round(amount * 100)` works | Accepted |
| `bookingId` invalid ObjectId | `findById` returns null | 404 |
| `booking.user` or `booking.student` null (unpopulated) | `._id.toString()` throws | Depends on populate |
| Parent with empty `children` | Authorization fails | Correct |
| Double payment intent for same booking | Overwrites `stripePaymentIntentId` | Last write wins; no idempotency key |

### 2.2 confirmPayment
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `paymentIntentId` from different booking | Metadata check | Rejected "Payment intent does not match booking" |
| Double confirm (idempotency) | Duplicate transaction records | `Transaction` created each time; no idempotency check |
| Race: webhook and confirmPayment both run | Both may update booking + create transaction | Duplicate transactions possible |
| `booking.student` unpopulated | `booking.student._id` undefined | Fallback to `booking.student` (ObjectId) |

### 2.3 handleWebhook
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Body already parsed by `express.json()` | Stripe signature verification fails | Webhook route must use raw body |
| Missing `stripe-signature` header | `constructEvent` throws | 400 with `err.message` (possible leak) |
| Replay attack (same event twice) | Duplicate processing | `existingTransaction` check in `handlePaymentSuccess` mitigates |
| `metadata.bookingId` missing | Early return, no error to Stripe | Logged only |

### 2.4 getPaymentStatus
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `bookingId` invalid ObjectId | `findById` may throw | Mongoose throws CastError |
| `booking.student` ObjectId vs string comparison | `booking.student.toString() === userId` | Works if both strings |
| Error response includes `error: err.message` | Information leakage | Yes, in 500 response |

---

## 3. Booking Controller

### 3.1 createBooking
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `student` / `tutor` invalid ObjectId | `User.findById` returns null | May proceed with null tutor |
| `subject` null/undefined | Config validation skipped if falsy | Could create booking with no subject? Schema requires it |
| `sessionDate` invalid (string "invalid") | `new Date("invalid")` is Invalid Date | Whereby/create may fail |
| `duration` negative, zero, or NaN | No validation | Could create invalid booking |
| `price` negative | Stored as-is | No validation |
| Subject validation error message | Leaks full subject list | `Available subjects are: ${validSubjects.join(', ')}` |

### 3.2 getUserBookings
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `page` = -1, 0, NaN | `skip` negative or NaN | MongoDB may behave unexpectedly |
| `limit` = 999999 or 0 | DoS or empty result | `Math.min(parseInt(limit, 10) || 50, 100)` caps at 100 |
| `limit` = "abc" | `parseInt("abc", 10)` = NaN | `Math.min(NaN, 100)` = NaN |

### 3.3 getBookingById (implied from routes)
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Parent accessing another parent's child's booking | Authorization | Must verify parent-child |

---

## 4. Membership Controller

### 4.1 selectPlan
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `parent.children.includes(studentId)` | ObjectId vs string; `includes` may fail | `children` are ObjectIds; `studentId` from body is string |
| `planId` invalid ObjectId | `findById` returns null | 404 |
| `sessionConfiguration` malformed for Summa Cum Laude | `sessionsPerWeek` undefined | Validation rejects |
| Parent selects for non-linked student | Authorization | `parent.children.includes(studentId)` – same type mismatch |

### 4.2 getPlanById
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `req.params.id` invalid ObjectId | `findById` throws CastError | 500 unless errorHandler catches |

---

## 5. Financials Controller

### 5.1 getTransactions
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `user.children.includes(childId)` | ObjectId vs string | `childId` from query is string |
| `search` with regex special chars | NoSQL injection via `$regex` | `{ $regex: search, $options: 'i' }` – user input not escaped |
| `limit` = -1 or very large | DoS | `parseInt(limit, 10)` – negative becomes negative |
| Admin path: `query` overwritten by `search` block | If `search` provided, `query` loses previous filters | Bug: `query = { $or: [...] }` overwrites |

### 5.2 createTransaction
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `transactionId = txn_${count + 1}` | Race: two concurrent requests same count | Duplicate transaction IDs |
| `amount` = NaN, Infinity, negative | Stored as-is | `parseFloat(amount)` |
| `userId` invalid ObjectId | Transaction references non-existent user | No validation |

---

## 6. Parent Link Controller

### 6.1 sendParentLinkRequest
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `user.children.includes(student._id)` | ObjectId comparison | Works if both ObjectIds |
| `studentEmail` with leading/trailing spaces | Normalized via trim | OK |

### 6.2 acceptParentLinkRequest
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Race: two concurrent accepts of same request | Both pass `status === 'pending'` | Both could add child; duplicate in array |
| `request.student` unpopulated | `request.student._id` undefined | Fallback `request.student` |
| `parent.children` read-modify-write | Not atomic | Race condition |

---

## 7. User Controller

### 7.1 linkChildToParent / unlinkChildFromParent
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `parent.children.includes(childId)` | `childId` from params is string; `children` are ObjectIds | May fail to detect existing link |
| `parent.children.filter(id => id.toString() !== childId)` | Correct string comparison | OK |

### 7.2 updateStudentPaymentPermission
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `user.children.includes(studentId)` | Same ObjectId vs string | Parent may be wrongly denied |

### 7.3 Certification Badges
| Hole | Risk | Current Behavior |
|------|------|------------------|
| `badgeIndex` = "1.5" or "abc" | `parseInt` returns 1 or NaN | Bounds check catches |
| `badgeIndex` negative | Bounds check | Rejected |
| Path traversal in `badge.imageUrl` | `path.join(__dirname, '..', url)` | If URL contains `..`, could escape |

---

## 8. File Upload Middleware

### 8.1 Multer
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Client spoofs `Content-Type` / `mimetype` | Multer uses `file.mimetype` | MIME type can be spoofed |
| Filename with `../` | Sanitization replaces `..` with `_` | Mitigated |
| Filename with null byte | `\0` in name | May cause issues on some FS |
| Empty `file.originalname` | `path.extname('')` = `''` | Filter may reject |

### 8.2 handleUploadError
| Hole | Risk | Current Behavior |
|------|------|------------------|
| Returns `err.message` to client | Information leakage | Yes |

---

## 9. Error Handler

### 9.1 errorHandler.js
| Hole | Risk | Current Behavior |
|------|------|------------------|
| 4xx errors expose `message` | Client errors – OK to expose | By design |
| 5xx in production | `shouldExposeDetails` false | Generic "An error occurred" |
| `err.errors` (Mongoose validation) | Exposed in response | Could leak schema details |
| Unhandled rejection in async route | May not reach errorHandler | Depends on Express version |

---

## 10. Concurrency & Idempotency Summary

| Operation | Idempotent? | Race Condition? |
|-----------|-------------|-----------------|
| confirmPayment | No – creates Transaction each time | Yes – duplicate transactions |
| handlePaymentSuccess | Partial – checks existingTransaction | Possible double booking update |
| acceptParentLinkRequest | No – double-add to children | Yes |
| createTransaction | No – transactionId collision | Yes |
| markBookingsAsPaidBatch | Unknown | No locking |

---

## 11. Error Message Leakage Summary

Controllers returning `error: err.message` or similar in 500 responses:
- paymentController (createPaymentIntent, confirmPayment, getPaymentStatus)
- financialsController (getFinancialStats, getRevenueTrend, getTransactions, createTransaction)
- userController (updateUserProfile, updateUser, updateStudentPaymentPermission, uploadCertificationBadge, deleteCertificationBadge, updateCertificationBadge)
- parentLinkController (sendParentLinkRequest, getParentLinkRequests, acceptParentLinkRequest, rejectParentLinkRequest, cancelParentLinkRequest)
- Others per exploration report

---

*This document should be updated as tests are written and new failure modes are discovered.*
