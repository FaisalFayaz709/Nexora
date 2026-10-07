# Processors

BullMQ processors are added only for non-critical asynchronous work. Stock, money and approval state are never moved here when part of one atomic transaction.
