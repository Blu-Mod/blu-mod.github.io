import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import log from './log';

const PACKAGER = 'https://packager.turbowarp.org';

const readBlobAsArrayBuffer = blob => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Cannot read blob as array buffer'));
    fr.readAsArrayBuffer(blob);
});

const PackagerIntegrationHOC = function (WrappedComponent) {
    class PackagerIntegrationComponent extends React.Component {
        constructor (props) {
            super(props);
            this.handleClickPackager = this.handleClickPackager.bind(this);
            this.handleMessage = this.handleMessage.bind(this);
        }
        componentDidMount () {
            window.addEventListener('message', this.handleMessage);
        }
        componentWillUnmount () {
            window.removeEventListener('message', this.handleMessage);
        }
        handleClickPackager () {
            window.open(`${PACKAGER}/?import_from=${location.origin}`);
        }
        handleMessage (e) {
            if (e.origin !== PACKAGER) {
                return;
            }

            // The packager needs to know that we will be importing something so it can display a loading screen
            e.source.postMessage({
                p4: {
                    type: 'start-import'
                }
            }, PACKAGER);

            this.props.vm.saveProjectSb3()
                .then(readBlobAsArrayBuffer)
                .then(buffer => {
                    const name = `${this.props.projectTitle}.sb3`;
                    e.source.postMessage({
                        p4: {
                            type: 'finish-import',
                            data: buffer,
                            name
                        }
                    }, PACKAGER, [buffer]);
                })
                .catch(err => {
                    log.error(err);
                    e.source.postMessage({
                        p4: {
                            type: 'cancel-import'
                        }
                    }, PACKAGER);
                });
        }
        render () {
            return (
                <WrappedComponent
                    onClickPackager={this.handleClickPackager}
                    {...this.props}
                />
            );
        }
    }
    PackagerIntegrationComponent.propTypes = {
        projectTitle: PropTypes.string,
        vm: PropTypes.shape({
            saveProjectSb3: PropTypes.func
        })
    };
    const mapStateToProps = state => ({
        projectTitle: state.scratchGui.projectTitle,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = () => ({});
    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(PackagerIntegrationComponent);
};

export {
    PackagerIntegrationHOC as default
};
