# Testing decisions:

- Our goal is not to reach 100% cov in files, we want readable and maintainable tests;
- Keep tests as simpler as possible;
- Utilize minimum objects for mocks and stubs, 
- we should not care about adding @ts/ignore in .test files;


## How to write tests:
- Do not create exaustive tests if:
    - Testing values under a range utilize upper limit and lower limit in a test.each to validate behavior;
    - When testing a file with if elses in them we should add a single test to each of them;
    - When testing a file with a lot of constrains, we should test each constrain by itself and aftewards add a single success test;
    - if a test is uses zod (and zod is already covered in another test), we can mock zod parse;