#!/usr/bin/env node

import chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as Listr from 'listr';
import * as Octokit from '@octokit/rest';

const main = async () => {
  const { token: githubToken } = await inquirer.prompt<{ token: string }>([{
    type: 'password',
    name: 'token',
    message: 'Please enter a GitHub token with "repo" and "read:org" permissions',
    validate: async (token: string) => {
      if (!token || token.length !== 40) return 'GitHub token must be 40 characters long';

      const tmpOcto = new Octokit({
        auth: `bearer ${token}`,
      });

      try {
        const response = await tmpOcto.users.getAuthenticated();
        const scopes: string[] = (response.headers as any)['x-oauth-scopes']
          .split(',')
          .map((s: string) => s.trim());
        if (!scopes.includes('read:org')) return 'GitHub token is missing required scope "read:org"';
        if (!scopes.includes('repo')) return 'GitHub token is missing required scope "repo"';
      } catch (err) {
        return 'GitHub token is invalid';
      }
      
      return true;
    }
  }]);

  const octo = new Octokit({
    auth: `bearer ${githubToken}`,
  });

  const allOrgs = (await octo.orgs.listForAuthenticatedUser({
    per_page: 100,
  })).data;

  const { org: selectedOrgId } = await inquirer.prompt<{ org: number }>([{
    type: 'list',
    name: 'org',
    choices: allOrgs.map((org) => ({
      name: org.login,
      value: org.id,
    })),
  }]);

  const org = allOrgs.find(o => o.id === selectedOrgId)!;

  type TaskContext = {
    repos: Octokit.ReposListForOrgResponseItem[];
  };

  const taskRunner = new Listr([
    {
      title: 'Listing Repositories',
      task: async (ctx: TaskContext) => {
        const opts = octo.repos.listForOrg.endpoint.merge({
          org: org.login,
        });
        ctx.repos = await octo.paginate(opts);
      },
    },
    {
      title: 'Disabling Wikis for all Repositories',
      task: async (ctx: TaskContext) => {
        return new Listr(ctx.repos.map(repo => ({
          title: `${org.login}/${repo.name}`,
          task: async () => {
            if (!repo.has_wiki) return;
            
            await octo.repos.update({
              owner: org.login,
              name: repo.name,
              has_wiki: false,
              repo: repo.name,
            })
          },
        })), {
          concurrent: 5,
        });
      },
    },
  ]);

  await taskRunner.run();
  
  console.log(chalk.green(`All Done: Wikis have been completely disabled for the ${chalk.cyan(`"${org.login}"`)} org`));
}

if (process.mainModule === module) {
  main().catch((err) => {
    console.error('Unhandled Exception:', err);
    process.exit(1);
  });
}
