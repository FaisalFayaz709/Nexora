# Communication Transaction Model

Sending a communication performs one database transaction:
1. verify active template when templateKey is provided;
2. create CommunicationLog;
3. create MessageAttachment references;
4. create channel-specific EmailDeliveryLog or SmsDeliveryLog evidence;
5. write business audit;
6. append communication.send.requested event;
7. commit.

Actual external provider delivery is intentionally after-commit because the
source asks to preserve communication evidence and delivery status, not to make
email/SMS provider calls part of the database transaction.
