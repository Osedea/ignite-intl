// Ignite CLI plugin for Intl
// ----------------------------------------------------------------------------

const NPM_MODULE_NAME = 'react-native-localize'
const NPM_MODULE_VERSION = '~1.3.1'

const REACT_INTL = 'react-intl'
const REACT_INTL_VERSION = '~3.6.0'

const INTL_PROVIDER_IMPORT = `import { RawIntlProvider } from 'react-intl';`;
const LOCALIZE_IMPORT = `import * as RNLocalize from 'react-native-localize';`;
const TRANSLATION_IMPORT = `import { getLocale, loadLocale, translate, registerLanguageListener, unregisterLanguageListener, intl, changeLanguage, currentLocale } from './i18n';`;
const HANDLE_LOCALIZATION_CHANGE = `\n    handleLocalizationChange = (locale: string) => {\n        this.setState({ locale });\n    };\n`;
const COMP_DID_MOUNT = `    componentDidMount() {\n        RNLocalize.addEventListener('change', getLocale);\n        registerLanguageListener(this.handleLocalizationChange);\n        loadLocale().then((lang) => lang && changeLanguage(lang));\n    }`;
const COMP_WILL_UNMOUNT = `    componentWillUnmount() {\n        RNLocalize.removeEventListener('change', getLocale);\n        unregisterLanguageListener(this.handleLocalizationChange);\n    }`;
const STATE = `    state = { locale: currentLocale };\n`;
const PROVIDER = `                <RawIntlProvider\n                    value={intl}\n                >`;
const CLOSE_PROVIDER = `                </RawIntlProvider>`;
const CHANGE_LANGUAGE = `    // changeLanguage = () => {\n    //     if (this.state.locale === 'en') {\n    //         changeLanguage('fr')\n    //     } else {\n    //         changeLanguage('en')\n    //     }\n    // }\n`;
const SCREEN_PROPS = `                        screenProps={{\n                            translate,\n                        }}`
const CHANGE_LANGUAGE_BUTTON = `                    {* <Button title={translate({ id: 'languageSwitch' })} onPress={this.changeLanguage} /> *}`

const add = async function (toolbox) {
    // Learn more about toolbox: https://infinitered.github.io/gluegun/#/toolbox-api.md
    const { ignite, print, filesystem, parameters: { options }, system } = toolbox
    const PLUGIN_PATH = __dirname
    const APP_PATH = process.cwd()
    const packageJSON = require(`${APP_PATH}/package.json`)
    const igniteJSON = require(`${APP_PATH}/ignite/ignite.json`)

    const spinner = toolbox.print.spin('adding packages')
    spinner.start();

    // install an NPM module and link it
    await ignite.addModule(NPM_MODULE_NAME, { link: packageJSON.dependencies['react-native'] < '0.60.0', version: NPM_MODULE_VERSION })
    await ignite.addModule(REACT_INTL, { link: false, version: REACT_INTL_VERSION })
    await system.spawn('pod install', { cwd: `${APP_PATH}/ios` });

    spinner.succeed('added packages');
    spinner.text = toolbox.print.colors.green('patch android jsc');
    spinner.start();

    // Jumping through hoops to have the good thing replaced
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: "* `def jscFlavor = 'org.webkit:android-jsc-intl:+'`",
        insert: `***ignore***`
    });
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: `android-jsc`,
        insert: `android-jsc-intl`
    });
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: '***ignore***',
        insert: "* `def jscFlavor = 'org.webkit:android-jsc-intl:+'`"
    });

    spinner.succeed('patched android jsc');

    let addTranslationFiles;

    if (options.translationFiles === undefined && igniteJSON.boilerplate !== 'osedea-react-native-boilerplate') {
        addTranslationFiles = await toolbox.prompt.confirm(
            'Do you want us to create translation files?'
        )
    } else {
        addTranslationFiles = options.addTranslationFiles || igniteJSON.boilerplate === 'osedea-react-native-boilerplate';
    }

    let FOLDER = `${APP_PATH}/app`;
    let EXTENSION = 'js';
    if (Object.keys(packageJSON.devDependencies).includes('typescript')) {
        EXTENSION = 'ts';
    }

    if (addTranslationFiles) {
        spinner.text = toolbox.print.colors.green('adding translation files');
        spinner.start();

        if (!filesystem.exists(FOLDER)) {
            FOLDER = APP_PATH;
        }

        filesystem.dir(`${FOLDER}/translations`)
        if (!filesystem.exists(`${FOLDER}/translations/en.${EXTENSION}`)) {
            filesystem.copy(`${PLUGIN_PATH}/templates/en.js`, `${FOLDER}/translations/en.${EXTENSION}`)
        }
        if (!filesystem.exists(`${FOLDER}/translations/fr.${EXTENSION}`)) {
            filesystem.copy(`${PLUGIN_PATH}/templates/fr.js`, `${FOLDER}/translations/fr.${EXTENSION}`)
        }
        if (!filesystem.exists(`${FOLDER}/i18n.${EXTENSION}`)) {
            filesystem.copy(`${PLUGIN_PATH}/templates/index.js`, `${FOLDER}/i18n.${EXTENSION}`)
        }

        spinner.succeed('added translation files');
    }

    if (filesystem.exists(`${FOLDER}/index.${EXTENSION}x`)) {
        let addMainImport;

        if (igniteJSON.boilerplate === 'osedea-react-native-boilerplate' || options.addMainImport) {
            addMainImport = true;
        }

        if (addMainImport === undefined) {
            addMainImport = await toolbox.prompt.confirm(
                `Do you want us to try setting up your main component for translation in ${FOLDER}/index.${EXTENSION}x? (this could be messy, now might be the good moment to commit all changes in another terminal)`
            )
        }

        if (addMainImport) {
            spinner.text = toolbox.print.colors.green('trying to patch main file');
            spinner.start();

            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                insert: INTL_PROVIDER_IMPORT,
                after: `import React, { Component } from 'react';`
            });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                insert: LOCALIZE_IMPORT,
                after: `import React, { Component } from 'react';`
            });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                insert: TRANSLATION_IMPORT,
                after: `import React, { Component } from 'react';`
            });
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: CHANGE_LANGUAGE,
                    after: `extends Component {`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add handleLocalizationChange');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: HANDLE_LOCALIZATION_CHANGE,
                    after: `extends Component {`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add handleLocalizationChange');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: COMP_WILL_UNMOUNT,
                    after: `extends Component {`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add componentWillUnmount');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: COMP_DID_MOUNT,
                    after: `extends Component {`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add componentDidMount');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: STATE,
                    after: `extends Component {`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add default state');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: SCREEN_PROPS,
                    after: `<RootNavigator`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add screenProps');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                    insert: CHANGE_LANGUAGE_BUTTON,
                    after: `/>`
                });
            } catch (e) {
                print.error('Oopsy, couldnt add changeLanguageButton');
            }
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                insert: PROVIDER,
                after: `<Provider store={store}>`
            });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, {
                insert: CLOSE_PROVIDER,
                before: `</Provider>`
            });

            spinner.succeed('patched main file');
        }
    }

    print.info(print.colors.success(`If you are using Jest and Typescript, check out the specific steps there: https://github.com/formatjs/react-intl`));
}

/**
 * Remove yourself from the project.
 */
const remove = async function (toolbox) {
    // Learn more about toolbox: https://infinitered.github.io/gluegun/#/toolbox-api.md
    const { ignite, print, filesystem, system, parameters: { options } } = toolbox
    const PLUGIN_PATH = __dirname
    const APP_PATH = process.cwd()
    const packageJSON = require(`${APP_PATH}/package.json`)
    const igniteJSON = require(`${APP_PATH}/ignite/ignite.json`)

    const spinner = toolbox.print.spin('removing packages')
    spinner.start();

    // remove the npm module and unlink it
    await ignite.removeModule(NPM_MODULE_NAME, { unlink: packageJSON.dependencies['react-native'] < '0.60.0' })
    await ignite.removeModule(REACT_INTL, { unlink: false })
    await system.spawn('pod install', { cwd: `${APP_PATH}/ios` });

    spinner.succeed('removed packages');

    spinner.text = toolbox.print.colors.green('unpatch android jsc');
    spinner.start();

    // Jumping through hoops to have the good thing replaced
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: "* `def jscFlavor = 'org.webkit:android-jsc-intl:+'`",
        insert: `***ignore***`
    });
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: `android-jsc-intl`,
        insert: `android-jsc`
    });
    ignite.patchInFile(`${APP_PATH}/android/app/build.gradle`, {
        replace: '***ignore***',
        insert: "* `def jscFlavor = 'org.webkit:android-jsc-intl:+'`"
    });

    spinner.succeed('unpatched android jsc');

    let removeTranslationFiles;

    if (options.translationFiles === undefined && igniteJSON.boilerplate !== 'osedea-react-native-boilerplate') {
        removeTranslationFiles = await toolbox.prompt.confirm(
            'Do you want us to remove translation files?'
        )
    } else {
        removeTranslationFiles = options.removeTranslationFiles || igniteJSON.boilerplate === 'osedea-react-native-boilerplate';
    }

    let FOLDER = `${APP_PATH}/app`;
    let EXTENSION = 'js';
    if (Object.keys(packageJSON.devDependencies).includes('typescript')) {
        EXTENSION = 'ts';
    }

    if (removeTranslationFiles) {
        spinner.text = toolbox.print.colors.green('removing translation files');
        spinner.start();

        if (!filesystem.exists(FOLDER)) {
            FOLDER = APP_PATH;
        }

        filesystem.remove(`${FOLDER}/translations`)
        filesystem.remove(`${FOLDER}/i18n.${EXTENSION}`)

        spinner.succeed('removed translation files');
    }

    if (filesystem.exists(`${FOLDER}/index.${EXTENSION}x`)) {
        let removeMainImport;

        if (igniteJSON.boilerplate === 'osedea-react-native-boilerplate' || options.removeMainImport) {
            removeMainImport = true;
        }

        if (removeMainImport === undefined) {
            removeMainImport = await toolbox.prompt.confirm(
                `Do you want us to try cleaning up your main component for translation in ${FOLDER}/index.${EXTENSION}x? (this could be messy, now might be the good moment to commit all changes in another terminal)`
            )
        }

        if (removeMainImport) {
            spinner.text = toolbox.print.colors.green('trying to unpatch main file');
            spinner.start();

            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: INTL_PROVIDER_IMPORT });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: LOCALIZE_IMPORT });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: TRANSLATION_IMPORT });
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: CHANGE_LANGUAGE });
            } catch (e) {
                print.error('Oopsy, couldnt remove handleLocalizationChange');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: HANDLE_LOCALIZATION_CHANGE });
            } catch (e) {
                print.error('Oopsy, couldnt remove handleLocalizationChange');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: COMP_WILL_UNMOUNT });
            } catch (e) {
                print.error('Oopsy, couldnt remove componentWillUnmount');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: COMP_DID_MOUNT });
            } catch (e) {
                print.error('Oopsy, couldnt remove componentDidMount');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: STATE });
            } catch (e) {
                print.error('Oopsy, couldnt remove default state');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: SCREEN_PROPS });
            } catch (e) {
                print.error('Oopsy, couldnt remove screenProps');
            }
            try {
                ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: CHANGE_LANGUAGE_BUTTON });
            } catch (e) {
                print.error('Oopsy, couldnt remove changeLanguageButton');
            }
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: PROVIDER });
            ignite.patchInFile(`${FOLDER}/index.${EXTENSION}x`, { delete: CLOSE_PROVIDER });

            spinner.succeed('unpatched main file');
        }
    }
}

// Required in all Ignite CLI plugins
module.exports = { add, remove }

