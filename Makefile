
REPORTER = spec
ALL_TESTS = $(shell find . -name '*.test.js' -not \( -wholename '*node_modules*' \))

run-tests:
	@mocha \
		--slow 200ms \
		$(TEST_FLAGS) \
		$(TESTS)

test:
	@$(MAKE) TESTS="$(ALL_TESTS)" TEST_FLAGS="--reporter spec" run-tests

test-terse:
	@$(MAKE) TESTS="$(ALL_TESTS)" TEST_FLAGS="--reporter dot" run-tests

.PHONY: test run-tests
