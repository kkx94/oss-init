name: Bug report
description: Report a bug to help us improve
title: "[Bug]: "
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of what the bug is.
      placeholder: What happened?
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: How can we reproduce the issue?
      placeholder: |
        1. Run `npm test`
        2. ...
        3. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What did you expect to happen?
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Version
      description: Which version of {{name}} are you using?
      placeholder: "0.1.0"
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: OS, Node.js version, and any other relevant details.
      placeholder: |
        OS: Ubuntu 24.04
        Node: v22.5.0
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output.
      render: shell
