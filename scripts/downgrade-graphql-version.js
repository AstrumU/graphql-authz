const fs = require('fs');

const version = process.argv[2];

const packagesToDowngrade = [
  {
    name: 'root',
    path: './package.json'
  },
];

const resolutionConfig = {
  'resolutions': {
    graphql: `^${version}`
  }
};

async function overridePackageJsonConfig(filePath, newContent) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const currentContent = await fs.promises.readFile(filePath, 'utf-8').then(JSON.parse);
  const mergedContent = JSON.stringify({ ...currentContent, ...newContent }, null, 2)
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await fs.promises.writeFile(filePath, mergedContent)
}

async function run() {
  if (version !== '15') {
    throw new Error(
      `downgrade-graphql-version script supports only version 15. Got ${version}`
    );
  }

  return Promise.all(
    packagesToDowngrade.map(package => overridePackageJsonConfig(package.path, resolutionConfig))
  )
}

run()
  .then(console.log(`Downgraded GraphQL to version ${version}`))
  .catch(e => console.error(e));
