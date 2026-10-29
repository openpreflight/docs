---
title: "Glossary"
description: "The one term that these docs use for each concept, and the words that they do not use."
sidebar:
  order: 6
---
These docs use one term for each concept. This table gives the term, the words
that the docs do not use for the same concept, and the meaning.

| Term | Do not use | Meaning |
|---|---|---|
| openpreflight | OpenPreflight | The product. The wordmark is lowercase. |
| server | worker, process, service, instance, binary | The openpreflight program that runs on your host. |
| repository | repo | A GitHub repository. |
| GitHub App | CI App | The App that you register on GitHub. After the first use on a page, you can write "App". |
| binding | repo binding, enabled repo | The row that lets a repository get checks. The list of bindings is the allow-list. |
| job | run (for the database row) | One execution of the pipeline for one commit. |
| Check Run | check, status | The GitHub object on the commit that shows the result of a job. |
| check suite | | The GitHub object that holds the Check Runs of one App for one commit. |
| run page | details page, log page, job page | The page at `/runs/{id}` that shows one job and its log. |
| pipeline | workflow, build file | The commands for a repository, from `.ci.yml`, the binding or the defaults. |
| step | stage, task | One command in a pipeline. |
| executor | runner | The part of the server that runs the steps of a job. |
| process executor | worker process | The executor that runs steps as processes on the server host. |
| Docker executor | container executor | The executor that runs steps with `docker run`. |
| path filter | path rule | A pattern that decides if a commit gets a job. |
| dry run | preview, simulation | A plan of what a commit will run, made without a job. |
| fork pull request | external PR | A pull request from a fork of the repository. |

## Labels in the UI

UI labels, field names and environment variables stay as the server shows them.
Examples: **Repos**, **Settings → Runner**, `CI_SECRET_KEY`. Write them in bold
or as code, so that they are not read as ordinary words.

## Related

- [Writing docs](https://github.com/openpreflight/docs/blob/main/CONTRIBUTING.md#writing-docs): the writing rules for these pages
