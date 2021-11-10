const fs = require('fs');

const version = process.argv[2];

const packageJsonList = [
  {
    name: 'root',
    path: './package.json'
  },
  {
    name: 'core',
    path: './packages/core/package.json'
  },
  {
    name: 'directive',
    path: './packages/directive/package.json'
  }
];

const commonDeps = {
  '15': {
    graphql: '^15'
  }
};

const rootDeps = {
  '15': {
    ...commonDeps['15'],
    'apollo-server': '^2',
    'apollo-server-plugin-base': '^0.13',
    'apollo-server-core': '^2'
  }
};

async function run() {
  const packageJsonContentList = await Promise.all(
    packageJsonList.map(async item => ({
      ...item,
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      content: await fs.promises.readFile(item.path, 'utf-8').then(JSON.parse)
    }))
  );

  switch (version) {
    case '15': {
      async function renamePluginInTests() {
        await fs.promises.rename(
          './__tests__/apollo-server-plugin.ts',
          './__tests__/apollo-server-v3-plugin.ts'
        );

        await fs.promises.rename(
          './__tests__/apollo-server-v2-plugin.ts',
          './__tests__/apollo-server-plugin.ts'
        );
      }

      function updatePackageJson() {
        return Promise.all(
          packageJsonContentList.map(item =>
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.promises.writeFile(
              item.path,
              JSON.stringify(
                {
                  ...item.content,
                  devDependencies: {
                    ...item.content.devDependencies,
                    ...(item.name === 'root'
                      ? rootDeps[version]
                      : commonDeps[version])
                  }
                },
                null,
                2
              )
            )
          )
        );
      }

      await Promise.all([renamePluginInTests(), updatePackageJson()]);

      break;
    }
    default:
      throw new Error(
        `downgrade-graphql-version script supports only version 15. Got ${version}`
      );
  }
}

run()
  .then(console.log(`Downgraded GraphQL to version ${version}`))
  .catch(e => console.error(e));
