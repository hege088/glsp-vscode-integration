/********************************************************************************
 * Copyright (c) 2020-2021 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import * as fs from 'fs';
import download from 'mvn-artifact-download';
import { join } from 'path';

const downloadDir = join(__dirname, '../extension/server');
const mavenRepository = 'https://repo1.maven.org/maven2/';
const groupId = 'org.eclipse.glsp.example';
const artifactId = 'org.eclipse.glsp.example.workflow';
const version = '1.0.0';
const classifier = 'glsp';

const serverExecutable = `${__dirname}/../extension/server/${artifactId}-${version}-${classifier}-SNAPSHOT.jar`;
if (fs.existsSync(serverExecutable)) {
    fs.unlinkSync(serverExecutable);
}
const isSnapShot = false;
console.log('Downloading latest version of the Workflow Example Java Server from the maven repository...');
download({ groupId, artifactId, version, classifier, isSnapShot }, downloadDir, mavenRepository)
    .then(() =>
        console.log(
            'Download completed. Start the server using this command: \njava -jar org.eclipse.glsp.example.workflow-' +
                version +
                `${isSnapShot ? '-SNAPSHOT' : ''}` +
                '-glsp.jar org.eclipse.glsp.example.workflow.launch.ExampleServerLauncher\n\n'
        )
    )
    .catch(err => console.error(err));
